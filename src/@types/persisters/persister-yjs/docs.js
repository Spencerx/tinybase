/**
 * The persister-yjs module of the TinyBase project provides a way to save and
 * load Store data to and from a Yjs document.
 *
 * A single entry point, the createYjsPersister function, is provided, which
 * returns a new Persister object that can bind a Store to a provided Yjs
 * document.
 * @see Third-Party CRDT Persistence guide
 * @packageDocumentation
 * @module persister-yjs
 * @since v4.0.0
 */
/// persister-yjs
/**
 * The YjsPersister interface represents a Persister that lets you save and load
 * Store data to and from a Yjs document.
 *
 * You should use the createYjsPersister function to create a YjsPersister
 * object.
 *
 * It is a minor extension to the Persister interface and simply provides an
 * extra getYDoc method for accessing the Yjs document the Store is being
 * persisted to.
 * @category Persister
 * @since v4.3.14
 */
/// YjsPersister
{
  /**
   * The getYDoc method returns the Yjs document the Store is being persisted
   * to.
   * @returns The Yjs document.
   * @example
   * This example creates a Persister object against a newly-created Store and
   * then gets the Yjs document back out again.
   *
   * ```js
   * import {createStore} from 'tinybase';
   * import {createYjsPersister} from 'tinybase/persisters/persister-yjs';
   * import {Doc} from 'yjs';
   *
   * const doc = new Doc();
   * const store = createStore().setTables({pets: {fido: {species: 'dog'}}});
   * const persister = createYjsPersister(store, doc);
   *
   * console.log(persister.getYDoc() == doc);
   * // -> true
   *
   * await persister.destroy();
   * ```
   * @category Getter
   * @since v4.3.14
   */
  /// YjsPersister.getYDoc
}
/**
 * The createYjsPersister function creates a YjsPersister object that can
 * persist the Store to a Yjs document.
 *
 * A YjsPersister only supports regular Store objects, and cannot be used to
 * persist the metadata of a MergeableStore.
 *
 * As well as providing a reference to the Store to persist, you must provide
 * the Yjs document to persist it to.
 * @param store The Store to persist.
 * @param yDoc The Yjs document to persist the Store to.
 * @param yMapName The name of the Y.Map used inside the Yjs document to sync
 * the Store to (which otherwise will default to 'tinybase').
 * @param onIgnoredError An optional handler for the errors that the Persister
 * would otherwise ignore when trying to save or load data. This is suitable for
 * debugging persistence issues in a development environment, since v4.0.4.
 * @returns A reference to the new YjsPersister object.
 * @example
 * This example creates a YjsPersister object and persists the Store to a Yjs
 * document.
 *
 * ```js
 * import {createStore} from 'tinybase';
 * import {createYjsPersister} from 'tinybase/persisters/persister-yjs';
 * import {Doc} from 'yjs';
 *
 * const doc = new Doc();
 * const store = createStore().setTables({pets: {fido: {species: 'dog'}}});
 * const persister = createYjsPersister(store, doc);
 *
 * await persister.save();
 * // Store will be saved to the document.
 *
 * console.log(doc.toJSON());
 * // -> {tinybase: {t: {pets: {fido: {species: 'dog'}}}, v: {}}}
 *
 * await persister.destroy();
 * ```
 * @example
 * This more complex example uses Yjs updates to keep two Store objects (each
 * with their own YjsPersister objects and Yjs documents) in sync with each
 * other. We use the `await` keyword extensively for the purpose of ensuring
 * sequentiality in this example.
 *
 * Typically, real-world synchronization would happen between two systems via a
 * Yjs connection provider. Here, we synthesize that with the `syncDocs`
 * function.
 *
 * ```js
 * import {createStore} from 'tinybase';
 * import {createYjsPersister} from 'tinybase/persisters/persister-yjs';
 * import {Doc, applyUpdate, encodeStateAsUpdate} from 'yjs';
 *
 * const doc1 = new Doc();
 * const doc2 = new Doc();
 *
 * // A function to manually synchronize documents with each other. Typically
 * // this would happen over the wire, via a Yjs connection provider.
 * const syncDocs = async () => {
 *   applyUpdate(doc1, encodeStateAsUpdate(doc2));
 *   applyUpdate(doc2, encodeStateAsUpdate(doc1));
 * };
 *
 * // Bind a persisted Store to each document.
 * const store1 = createStore();
 * const persister1 = createYjsPersister(store1, doc1);
 * await persister1.startAutoLoad();
 * await persister1.startAutoSave();
 *
 * const store2 = createStore();
 * const persister2 = createYjsPersister(store2, doc2);
 * await persister2.startAutoLoad();
 * await persister2.startAutoSave();
 *
 * // Synchronize the documents in their initial state.
 * await syncDocs();
 *
 * // Make a change to each of the two Stores.
 * store1.setTables({pets: {fido: {species: 'dog'}}});
 * store2.setValues({open: true});
 * // ...
 *
 * // Synchronize the documents with each other again.
 * await syncDocs();
 *
 * // Ensure the Stores are in sync.
 * console.log(store1.getContent());
 * // -> [{pets: {fido: {species: 'dog'}}}, {open: true}]
 * console.log(store2.getContent());
 * // -> [{pets: {fido: {species: 'dog'}}}, {open: true}]
 *
 * await persister1.destroy();
 * await persister2.destroy();
 * ```
 * @category Creation
 * @since v4.0.0
 */
/// createYjsPersister
