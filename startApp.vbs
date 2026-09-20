Set objShell = CreateObject("WScript.Shell")
strBatchPath = objShell.CurrentDirectory & "\run-local.bat"
objShell.Run strBatchPath, 0, False
