# Manual installation for developers working on this extension

You can copy the whole project to:

- Mac/Linux: `~/.vscode/extensions`
- Windows: `C:\Users\<user name>\.vscode\extensions`

Alternatively, you can build the project into an installable `.vsix` file:

```console
$ npm run build
$ code --install-extension build/origami.vsix
```

# Publishing

To publish the extension to the VS Code Marketplace:

```console
$ npx @vscode/vsce publish
```
