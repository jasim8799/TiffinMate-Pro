@echo off
echo.
echo ========================================
echo Testing TiffinMate Subscription Plans API
echo ========================================
echo.
echo Testing: https://tiffinmate-pro.onrender.com/api/subscription-plans
echo.

curl -s https://tiffinmate-pro.onrender.com/api/subscription-plans 2>nul

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to connect to API
    echo.
    echo Possible reasons:
    echo 1. Render is still deploying (wait 2-3 minutes)
    echo 2. Internet connection issue
    echo 3. Render service is sleeping (first request takes 30-60 seconds)
    echo.
) else (
    echo.
    echo SUCCESS: API responded!
    echo.
)

echo.
echo Next step: Run seed script in Render Shell
echo Command: node seedProductionPlans.js
echo.
pause
