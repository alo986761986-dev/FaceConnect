; FaceConnect NSIS Installer Script

!macro customHeader
  !system "echo 'FaceConnect Installer'"
!macroend

!macro customInit
  ; Check for Windows 10/11
  ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuild"
  ${If} $R0 < 10240
    MessageBox MB_OK|MB_ICONSTOP "FaceConnect requires Windows 10 or later."
    Abort
  ${EndIf}
!macroend

!macro customInstall
  ; Create required directories
  CreateDirectory "$INSTDIR\data"
  
  ; Set file permissions
  AccessControl::GrantOnFile "$INSTDIR\data" "(BU)" "FullAccess"
!macroend

!macro customUnInstall
  ; Clean up user data (optional - commented out to preserve user data)
  ; RMDir /r "$INSTDIR\data"
!macroend
