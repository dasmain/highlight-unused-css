import fg from "fast-glob";
import fs from "fs";
import postcss from "postcss";
import postcssScss from "postcss-scss";
import * as vscode from "vscode";

let diagnosticCollection: vscode.DiagnosticCollection;

const parseStyleFile = (content: string, file: string) => {
  if (file.endsWith(".scss")) {
    return postcssScss.parse(content, { from: file });
  } else {
    return postcss.parse(content, { from: file });
  }
};

async function analyzeWorkspace() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  const root = workspaceFolders[0].uri.fsPath;

  const scssPath = `${root}/src/index.scss`;
  const cssPath = `${root}/src/index.css`;

  let stylePath = "";
  if (fs.existsSync(scssPath)) {
    stylePath = scssPath;
  } else if (fs.existsSync(cssPath)) {
    stylePath = cssPath;
  } else {
    return;
  }

  const styleContent = fs.readFileSync(stylePath, "utf-8");
  const rootAst = parseStyleFile(styleContent, stylePath);

  const classNames: { name: string; line: number; col: number }[] = [];

  rootAst.walkRules((rule) => {
    if (rule.selector.startsWith(".")) {
      const cls = rule.selector.split(":")[0].replace(/^\./, "").trim();
      if (cls && rule.source?.start) {
        classNames.push({
          name: cls,
          line: rule.source.start.line - 1,
          col: rule.source.start.column - 1,
        });
      }
    }
  });

  const files = await fg("**/*.{js,jsx,ts,tsx}", {
    cwd: root,
    ignore: ["node_modules", ".next", "dist"],
  });

  const usedClasses = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(`${root}/${file}`, "utf-8");

    classNames.forEach((cls) => {
      const className = cls.name.replace(/^\./, "");
      if (className.includes(".")) {
        const classSplit = className.split(".");
        classSplit.forEach((clsplit) => {
          const cleanedClassName = clsplit.trim();
          const regex = new RegExp(`\\b${cleanedClassName}\\b`, "g");
          if (regex.test(content)) {
            usedClasses.add(cleanedClassName);
          }
        });
      } else {
        const regex = new RegExp(`\\b${className}\\b`, "g");
        if (regex.test(content)) {
          usedClasses.add(className);
        }
      }
    });
  }

  const diagnostics: vscode.Diagnostic[] = [];

  classNames.forEach(({ name, line, col }) => {
    if (!usedClasses.has(name)) {
      const range = new vscode.Range(line, col, line, col + name.length + 1);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Class ".${name}" is not used in project`,
        vscode.DiagnosticSeverity.Warning
      );
      diagnostics.push(diagnostic);
    }
  });

  diagnosticCollection.set(vscode.Uri.file(stylePath), diagnostics);
}

export async function activate(context: vscode.ExtensionContext) {
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("unused-styles");
  context.subscriptions.push(diagnosticCollection);

  analyzeWorkspace();

  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{js,jsx,ts,tsx,scss,css}"
  );
  watcher.onDidChange(() => analyzeWorkspace());
  watcher.onDidCreate(() => analyzeWorkspace());
  watcher.onDidDelete(() => analyzeWorkspace());
  context.subscriptions.push(watcher);
}

export function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}
