; WargaPOS Windows Installer
; Build with: makensis /DVERSION=1.0.0 /DBUILD_DIR=..\build installer.nsi
;
; Requires NSIS 3.x (Unicode)

Unicode True

!ifndef VERSION
  !define VERSION "1.0.0"
!endif

!ifndef BUILD_DIR
  !define BUILD_DIR "..\build"
!endif

;---------------------------------------------------------------------------
; General
;---------------------------------------------------------------------------
Name              "WargaPOS ${VERSION}"
OutFile           "..\dist\wargapos-setup-${VERSION}.exe"
InstallDir        "C:\WargaPOS"
InstallDirRegKey  HKLM "Software\WargaPOS" "InstallDir"
RequestExecutionLevel admin
ShowInstDetails   show
ShowUnInstDetails show

;---------------------------------------------------------------------------
; Pages
;---------------------------------------------------------------------------
!include "MUI2.nsh"

!define MUI_ABORTWARNING
!define MUI_ICON    "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON  "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Open WargaPOS in browser"
!define MUI_FINISHPAGE_RUN_FUNCTION "OpenBrowser"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

;---------------------------------------------------------------------------
; Install Section
;---------------------------------------------------------------------------
Section "WargaPOS" SEC_MAIN
  SectionIn RO   ; Required

  ; ── Server binaries ──────────────────────────────────────────────────────
  SetOutPath "$INSTDIR\server"
  File "${BUILD_DIR}\wargapos-server.exe"
  File "${BUILD_DIR}\wargapos-migrate.exe"
  File "config.yaml.tmpl"
  File "setup.ps1"
  CreateDirectory "$INSTDIR\server\uploads"

  ; ── PostgreSQL portable ──────────────────────────────────────────────────
  SetOutPath "$INSTDIR\postgres"
  File /r "${BUILD_DIR}\pgsql\*.*"

  ; ── NSSM ─────────────────────────────────────────────────────────────────
  SetOutPath "$INSTDIR\tools"
  File "${BUILD_DIR}\nssm.exe"

  ; ── Run setup PowerShell script ──────────────────────────────────────────
  DetailPrint "Initialising database and services..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\server\setup.ps1" -InstDir "$INSTDIR"'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Setup failed (exit code $0). Check the installer log for details."
    Abort
  ${EndIf}

  ; ── Firewall rule ─────────────────────────────────────────────────────────
  DetailPrint "Adding Windows Firewall rule..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="WargaPOS Server" dir=in action=allow protocol=TCP localport=8080 description="WargaPOS POS Server"'

  ; ── Registry for uninstaller ─────────────────────────────────────────────
  WriteRegStr   HKLM "Software\WargaPOS" "InstallDir" "$INSTDIR"
  WriteRegStr   HKLM "Software\WargaPOS" "Version"    "${VERSION}"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "DisplayName"          "WargaPOS"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "DisplayVersion"       "${VERSION}"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "Publisher"            "WargaPOS"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "UninstallString"      "$INSTDIR\uninstall.exe"
  WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "InstallLocation"      "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "NoModify"             1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS" \
                     "NoRepair"             1

  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; ── Start Menu shortcuts ─────────────────────────────────────────────────
  CreateDirectory "$SMPROGRAMS\WargaPOS"
  CreateShortcut  "$SMPROGRAMS\WargaPOS\Open WargaPOS.lnk" \
                  "$WINDIR\explorer.exe" "http://localhost:8080"
  CreateShortcut  "$SMPROGRAMS\WargaPOS\Server Config.lnk" \
                  "notepad.exe" "$INSTDIR\server\config.yaml"
  CreateShortcut  "$SMPROGRAMS\WargaPOS\Uninstall.lnk" \
                  "$INSTDIR\uninstall.exe"
SectionEnd

;---------------------------------------------------------------------------
; Finish page helper
;---------------------------------------------------------------------------
Function OpenBrowser
  ExecShell "open" "http://localhost:8080"
FunctionEnd

;---------------------------------------------------------------------------
; Uninstall Section
;---------------------------------------------------------------------------
Section "Uninstall"
  ; ── Stop and remove services ─────────────────────────────────────────────
  DetailPrint "Stopping WargaPOS server..."
  nsExec::ExecToLog '"$INSTDIR\tools\nssm.exe" stop WargaPOS-Server'
  nsExec::ExecToLog '"$INSTDIR\tools\nssm.exe" remove WargaPOS-Server confirm'

  DetailPrint "Stopping PostgreSQL service..."
  nsExec::ExecToLog 'net stop WargaPOS-DB'
  nsExec::ExecToLog '"$INSTDIR\postgres\bin\pg_ctl.exe" unregister -N WargaPOS-DB'

  ; ── Remove firewall rule ──────────────────────────────────────────────────
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="WargaPOS Server"'

  ; ── Ask about data directory ─────────────────────────────────────────────
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove the database data directory?$\n($INSTDIR\postgres\data)$\n$\nThis will permanently delete all your data." IDNO skip_data
    RMDir /r "$INSTDIR\postgres\data"
  skip_data:

  ; ── Remove files ──────────────────────────────────────────────────────────
  RMDir /r "$INSTDIR\server"
  RMDir /r "$INSTDIR\postgres\bin"
  RMDir /r "$INSTDIR\postgres\lib"
  RMDir /r "$INSTDIR\postgres\share"
  RMDir /r "$INSTDIR\tools"
  Delete    "$INSTDIR\uninstall.exe"
  RMDir     "$INSTDIR"

  ; ── Remove Start Menu shortcuts ───────────────────────────────────────────
  RMDir /r "$SMPROGRAMS\WargaPOS"

  ; ── Remove registry keys ──────────────────────────────────────────────────
  DeleteRegKey HKLM "Software\WargaPOS"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\WargaPOS"
SectionEnd
