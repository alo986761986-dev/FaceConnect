; FaceConnect NSIS Installer Script
; Simple installer without AccessControl plugin

!macro customInstall
  ; Create required directories
  CreateDirectory "$INSTDIR\data"
!macroend

!macro customUnInstall
  ; Cleanup handled by electron-builder
!macroend
