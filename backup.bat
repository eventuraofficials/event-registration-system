@echo off
echo ========================================
echo Database Backup Utility
echo ========================================
echo.

REM Create backups directory if not exists
if not exist "backups\" mkdir backups

REM Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

REM Backup database
if exist "events.db" (
    echo Creating backup...
    copy events.db "backups\events_backup_%TIMESTAMP%.db"
    echo.
    echo Backup created: backups\events_backup_%TIMESTAMP%.db
    echo.

    REM Show file size
    for %%F in (events.db) do echo Database size: %%~zF bytes
    echo.

    echo Backup completed successfully!
) else (
    echo ERROR: Database file not found!
)

echo.
pause
