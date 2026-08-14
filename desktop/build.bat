@echo off
REM Build SALI-IDOL-Vote.exe (Windows). Jalankan di folder desktop\.
REM Prasyarat: python -m pip install -r requirements.txt

python -m PyInstaller --onefile --windowed --name "SALI-IDOL-Vote" ^
  --add-data "config.ini;." ^
  main.py

echo.
echo Selesai. Hasil: dist\SALI-IDOL-Vote.exe
echo Letakkan config.ini di samping exe untuk mengubah api_base tanpa rebuild.
pause
