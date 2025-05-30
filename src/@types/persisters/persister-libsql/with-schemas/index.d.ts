/// persister-libsql
import type {Client} from '@libsql/client';
import type {
  OptionalSchemas,
  Store,
} from '../../../store/with-schemas/index.d.ts';
import type {
  DatabasePersisterConfig,
  Persister,
} from '../../with-schemas/index.d.ts';

/// LibSqlPersister
export interface LibSqlPersister<Schemas extends OptionalSchemas>
  extends Persister<Schemas> {
  /// LibSqlPersister.getClient
  getClient(): Client;
}

/// createLibSqlPersister
export function createLibSqlPersister<Schemas extends OptionalSchemas>(
  store: Store<Schemas>,
  client: Client,
  configOrStoreTableName?: DatabasePersisterConfig<Schemas> | string,
  onSqlCommand?: (sql: string, params?: any[]) => void,
  onIgnoredError?: (error: any) => void,
): LibSqlPersister<Schemas>;
