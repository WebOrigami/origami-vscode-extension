# Extension for the Origami expression language

A [Microsoft Visual Studio Code](https://code.visualstudio.com/) extension that adds syntax highlighting and basic editor support for the [Origami](https://weborigami.org) expression language.

## Supported language editing features

This extension uses the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) to provide several basic language editing features in `.ori` files.

- **Diagnostics:** Origami syntax errors are highlighted. In VS Code, an error is indicated with a squiggly red underline; hovering over this will display the error message.

- **AutoComplete:** Suggests the names of [Origami builtin functions](https://weborigami.org/builtins/) (both with and without namespace prefixes), folders and files in project scope, and object properties and function parameters in the local file. AutoComplete can also be used to extend a slash-separated file path: if you type `src/`, then AutoComplete will suggest the names of folders and files in the `src` folder.

- **Go to Definition:** You can navigate from a path that starts with a file reference to the corresponding file, or navigate from a reference to a local object property or lambda function parameter to the location of the corresponding property or parameter. In VS Code: put the insertion point anywhere in a reference, then use the Go menu's "Go to Definition" command or press the keyboard shortcut (typically F12).

These features currently work only in `.ori` files; they do not yet work in [Origami template documents](https://weborigami.org/language/templatedocuments) with extensions like `.ori.html`.

These features have been designed for use in, and tested in, VS Code. They could become the basis for extensions for other code development environments that support the Language Server Protocol; contributions are welcome.
