import {Doc as YDoc, type YEvent, Map as YMap} from 'yjs';
import type {Id} from '../../@types/common/index.d.ts';
import type {PersisterListener} from '../../@types/persisters/index.d.ts';
import type {
  YjsPersister,
  createYjsPersister as createYjsPersisterDecl,
} from '../../@types/persisters/persister-yjs/index.d.ts';
import type {
  Cell,
  Changes,
  Content,
  Store,
  Tables,
  Values,
} from '../../@types/store/index.d.ts';
import {arrayForEach, arrayIsEmpty, arrayShift} from '../../common/array.ts';
import {mapForEach} from '../../common/map.ts';
import {IdObj, objEnsure, objHas, objMap, objNew} from '../../common/obj.ts';
import {ifNotUndefined, isUndefined, size} from '../../common/other.ts';
import {T, TINYBASE, V} from '../../common/strings.ts';
import {createCustomPersister} from '../common/create.ts';

type Observer = (events: YEvent<any>[]) => void;

const DELETE = 'delete';

const getYContent = (yContent: YMap<any>) => [yContent.get(T), yContent.get(V)];

const getChangesFromYDoc = (
  yContent: YMap<any>,
  events: YEvent<any>[],
): Changes => {
  if (size(events) == 1 && arrayIsEmpty(events[0].path)) {
    return [yContent.get(T).toJSON(), yContent.get(V).toJSON(), 1];
  }
  const [yTables, yValues] = getYContent(yContent);
  const tables = {} as any;
  const values = {} as any;
  arrayForEach(events, ({path, changes: {keys}}) =>
    arrayShift(path) == T
      ? ifNotUndefined(
          arrayShift(path) as string,
          (yTableId) => {
            const table = objEnsure(tables, yTableId, objNew) as any;
            const yTable = yTables.get(yTableId) as YMap<YMap<Cell>>;
            ifNotUndefined(
              arrayShift(path) as string,
              (yRowId) => {
                const row = objEnsure(table, yRowId, objNew) as any;
                const yRow = yTable.get(yRowId) as YMap<Cell>;
                mapForEach(
                  keys,
                  (cellId, {action}) =>
                    (row[cellId] = action == DELETE ? null : yRow.get(cellId)),
                );
              },
              () =>
                mapForEach(
                  keys,
                  (rowId, {action}) =>
                    (table[rowId] =
                      action == DELETE ? null : yTable.get(rowId)?.toJSON()),
                ),
            );
          },
          () =>
            mapForEach(
              keys,
              (tableId, {action}) =>
                (tables[tableId] =
                  action == DELETE ? null : yTables.get(tableId)?.toJSON()),
            ),
        )
      : mapForEach(
          keys,
          (valueId, {action}) =>
            (values[valueId] = action == DELETE ? null : yValues.get(valueId)),
        ),
  );
  return [tables, values, 1];
};

const applyChangesToYDoc = (
  yContent: YMap<any>,
  getContent: () => Content,
  changes?: Changes,
) => {
  if (!yContent.size) {
    yContent.set(T, new YMap());
    yContent.set(V, new YMap());
  }
  const [yTables, yValues] = getYContent(yContent);
  const changesDidFail = () => {
    changesFailed = 1;
  };
  let changesFailed = 1;
  ifNotUndefined(changes, ([cellChanges, valueChanges]) => {
    changesFailed = 0;
    objMap(cellChanges, (table, tableId) =>
      changesFailed
        ? 0
        : isUndefined(table)
          ? yTables.delete(tableId)
          : ifNotUndefined(
              yTables.get(tableId),
              (yTable) =>
                objMap(table, (row, rowId) =>
                  changesFailed
                    ? 0
                    : isUndefined(row)
                      ? yTable.delete(rowId)
                      : ifNotUndefined(
                          yTable.get(rowId),
                          (yRow) =>
                            objMap(row, (cell, cellId) =>
                              isUndefined(cell)
                                ? yRow.delete(cellId)
                                : yRow.set(cellId, cell),
                            ),
                          changesDidFail,
                        ),
                ),
              changesDidFail,
            ),
    );
    objMap(valueChanges, (value, valueId) =>
      changesFailed
        ? 0
        : isUndefined(value)
          ? yValues.delete(valueId)
          : yValues.set(valueId, value),
    );
  });
  if (changesFailed) {
    const [tables, values] = getContent();
    yMapMatch(yTables, undefined, tables, (_, tableId, table) =>
      yMapMatch(yTables, tableId, table, (yTable, rowId, row) =>
        yMapMatch(yTable, rowId, row, (yRow, cellId, cell) => {
          if (yRow.get(cellId) !== cell) {
            yRow.set(cellId, cell);
            return 1;
          }
        }),
      ),
    );
    yMapMatch(yValues, undefined, values, (_, valueId, value) => {
      if (yValues.get(valueId) !== value) {
        yValues.set(valueId, value);
      }
    });
  }
};

const yMapMatch = (
  yMapOrParent: YMap<any>,
  idInParent: Id | undefined,
  obj: IdObj<any>,
  set: (yMap: YMap<any>, id: Id, value: any) => 1 | void,
): 1 | void => {
  const yMap = isUndefined(idInParent)
    ? yMapOrParent
    : (yMapOrParent.get(idInParent) ??
      yMapOrParent.set(idInParent, new YMap()));
  let changed: 1 | undefined;
  objMap(obj, (value, id) => {
    if (set(yMap, id, value)) {
      changed = 1;
    }
  });
  yMap.forEach((_: any, id: Id) => {
    if (!objHas(obj, id)) {
      yMap.delete(id);
      changed = 1;
    }
  });
  if (!isUndefined(idInParent) && !yMap.size) {
    yMapOrParent.delete(idInParent);
  }
  return changed;
};

export const createYjsPersister = ((
  store: Store,
  yDoc: YDoc,
  yMapName = TINYBASE,
  onIgnoredError?: (error: any) => void,
): YjsPersister => {
  const yContent: YMap<any> = yDoc.getMap(yMapName);

  const getPersisted = async (): Promise<Content | undefined> =>
    yContent.size
      ? ([yContent.get(T).toJSON(), yContent.get(V).toJSON()] as [
          Tables,
          Values,
        ])
      : undefined;

  const setPersisted = async (
    getContent: () => Content,
    changes?: Changes,
  ): Promise<void> =>
    yDoc.transact(() => applyChangesToYDoc(yContent, getContent, changes));

  const addPersisterListener = (listener: PersisterListener): Observer => {
    const observer: Observer = (events) =>
      listener(undefined, getChangesFromYDoc(yContent, events));
    yContent.observeDeep(observer);
    return observer;
  };

  const delPersisterListener = (observer: Observer): void => {
    yContent.unobserveDeep(observer);
  };

  return createCustomPersister(
    store,
    getPersisted,
    setPersisted,
    addPersisterListener,
    delPersisterListener,
    onIgnoredError,
    1, // StoreOnly,
    {getYDoc: () => yDoc},
  ) as YjsPersister;
}) as typeof createYjsPersisterDecl;
