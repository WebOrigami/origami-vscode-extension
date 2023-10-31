const path = require("path");
const vscode = require("vscode");

/** @typedef {File | Directory} Entry */

/**
 * @implements {vscode.FileStat}
 */
class File {
  /**
   * @param {string} name
   */
  constructor(name) {
    /** @type {vscode.FileType} */
    this.type = vscode.FileType.File;

    /** @type {number} */
    this.ctime = Date.now();

    /** @type {number} */
    this.mtime = Date.now();

    /** @type {number} */
    this.size = 0;

    /** @type {string} */
    this.name = name;

    /** @type {Uint8Array} */
    this.data = null;
  }
}

/**
 * @implements {vscode.FileStat}
 */
class Directory {
  /**
   * @param {string} name
   */
  constructor(name) {
    /** @type {vscode.FileType} */
    this.type = vscode.FileType.Directory;

    /** @type {number} */
    this.ctime = Date.now();

    /** @type {number} */
    this.mtime = Date.now();

    /** @type {number} */
    this.size = 0;

    /** @type {string} */
    this.name = name;

    /** @type {Map<string, Entry>} */
    this.entries = new Map();
  }
}

/**
 * An implementation of the vscode.FileSystemProvider interface backed by an
 * AsyncTree.
 *
 * Unofficial (?) documentation for the interface can be found at
 * https://vscode-api.js.org/interfaces/vscode.FileSystemProvider.html.
 *
 * @implements {vscode.FileSystemProvider}
 */
class TreeFS {
  root = new Directory("");

  /**
   * Create a new directory.
   *
   * @param {vscode.Uri} uri
   */
  createDirectory(uri) {
    const basename = path.posix.basename(uri.path);
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    const parent = this._lookupAsDirectory(dirname, false);

    const entry = new Directory(basename);
    parent.entries.set(entry.name, entry);
    parent.mtime = Date.now();
    parent.size += 1;
    this._fireSoon(
      { type: vscode.FileChangeType.Changed, uri: dirname },
      { type: vscode.FileChangeType.Created, uri }
    );
  }

  /**
   * Delete a file.
   *
   * @param {vscode.Uri} uri
   */
  delete(uri) {
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    const basename = path.posix.basename(uri.path);
    const parent = this._lookupAsDirectory(dirname, false);
    if (!parent.entries.has(basename)) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    parent.entries.delete(basename);
    parent.mtime = Date.now();
    parent.size -= 1;
    this._fireSoon(
      { type: vscode.FileChangeType.Changed, uri: dirname },
      { uri, type: vscode.FileChangeType.Deleted }
    );
  }

  /**
   * Retrieve all entries of a directory.
   *
   * @param {vscode.Uri} uri
   */
  readDirectory(uri) {
    const entry = this._lookupAsDirectory(uri, false);
    /** type {[string, vscode.FileType][]} */
    const result = [];
    for (const [name, child] of entry.entries) {
      result.push([name, child.type]);
    }
    return result;
  }

  /**
   * Read the entire contents of a file.
   *
   * @param {vscode.Uri} uri
   */
  readFile(uri) {
    const data = this._lookupAsFile(uri, false).data;
    if (data) {
      return data;
    }
    throw vscode.FileSystemError.FileNotFound();
  }

  /**
   * Retrieve metadata about a file.
   *
   * @param {vscode.Uri} uri
   * @returns {vscode.FileStat}
   */
  stat(uri) {
    return this._lookup(uri, false);
  }

  /**
   * Write data to a file, replacing its entire contents.
   *
   * @param {vscode.Uri} uri
   * @param {Uint8Array} content
   * @param {{ create: boolean, overwrite: boolean }} options
   */
  writeFile(uri, content, options) {
    const basename = path.posix.basename(uri.path);
    const parent = this._lookupParentDirectory(uri);
    let entry = parent.entries.get(basename);
    if (entry instanceof Directory) {
      throw vscode.FileSystemError.FileIsADirectory(uri);
    }
    if (!entry && !options.create) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    if (entry && options.create && !options.overwrite) {
      throw vscode.FileSystemError.FileExists(uri);
    }
    if (!entry) {
      entry = new File(basename);
      parent.entries.set(basename, entry);
      this._fireSoon({ type: vscode.FileChangeType.Created, uri });
    }
    entry.mtime = Date.now();
    entry.size = content.byteLength;
    entry.data = content;

    this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
  }

  /**
   * Rename a file or folder.
   *
   * @param {vscode.Uri} oldUri
   * @param {vscode.Uri} newUri
   * @param {{ overwrite: boolean }} options
   */
  rename(oldUri, newUri, options) {
    if (!options.overwrite && this._lookup(newUri, true)) {
      throw vscode.FileSystemError.FileExists(newUri);
    }

    const entry = this._lookup(oldUri, false);
    const oldParent = this._lookupParentDirectory(oldUri);

    const newParent = this._lookupParentDirectory(newUri);
    const newName = path.posix.basename(newUri.path);

    oldParent.entries.delete(entry.name);
    entry.name = newName;
    newParent.entries.set(newName, entry);

    this._fireSoon(
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri }
    );
  }

  /**
   * Subscribe to file change events in the file or folder denoted by uri.
   *
   * @param {vscode.Uri} _resource
   */
  watch(_resource) {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }

  /**
   * @param {vscode.Uri} uri
   * @param {{boolean}} [silent]
   */
  _lookup(uri, silent = false) {
    const parts = uri.path.split("/");
    let entry = this.root;
    for (const part of parts) {
      if (!part) {
        continue;
      }
      /** @type {Entry|undefined} */
      let child;
      if (entry instanceof Directory) {
        child = entry.entries.get(part);
      }
      if (!child) {
        if (!silent) {
          throw vscode.FileSystemError.FileNotFound(uri);
        } else {
          return undefined;
        }
      }
      entry = child;
    }
    return entry;
  }

  /**
   * @param {vscode.Uri} uri
   * @param {boolean} silent
   * @returns
   */
  _lookupAsDirectory(uri, silent) {
    const entry = this._lookup(uri, silent);
    if (entry instanceof Directory) {
      return entry;
    }
    throw vscode.FileSystemError.FileNotADirectory(uri);
  }

  /**
   * @param {vscode.Uri} uri
   * @param {boolean} silent
   * @returns {File}
   */
  _lookupAsFile(uri, silent) {
    const entry = this._lookup(uri, silent);
    if (entry instanceof File) {
      return entry;
    }
    throw vscode.FileSystemError.FileIsADirectory(uri);
  }

  /**
   * @param {vscode.Uri} uri
   */
  _lookupParentDirectory(uri) {
    const dirname = uri.with({ path: path.posix.dirname(uri.path) });
    return this._lookupAsDirectory(dirname, false);
  }

  /** @type {vscode.EventEmitter<vscode.FileChangeEvent[]>} */
  _emitter = new vscode.EventEmitter();

  /** @type {vscode.FileChangeEvent[]} */
  _bufferedEvents = [];

  /** @type {NodeJS.Timer} */
  _fireSoonHandle;

  /** @type {vscode.Event<vscode.FileChangeEvent[]>} */
  onDidChangeFile = this._emitter.event;

  /**
   * @param {vscode.FileChangeEvent[]} events
   */
  _fireSoon(...events) {
    this._bufferedEvents.push(...events);

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._emitter.fire(this._bufferedEvents);
      this._bufferedEvents.length = 0;
    }, 5);
  }
}

module.exports = {
  File,
  Directory,
  TreeFS,
};
