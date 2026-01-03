Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TODAY-ONLY MEALS - API TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZhMmFiM2Y1ZTZiYWUyYTcwYjk4ZjYiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3MzU4NzYzNzQsImV4cCI6MTczNjQ4MTE3NH0.aP4jtNZ43O3CY9Aq3D-q04AiPJNBSd43Y0wJOtMZ4_o"
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "TEST 1: Dashboard API" -ForegroundColor Yellow
try {
    $d = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/dashboard" -Headers $headers
    Write-Host "Dashboard: Lunch=$($d.data.todayOrders.lunch) Dinner=$($d.data.todayOrders.dinner) Total=$($d.data.todayOrders.total)" -ForegroundColor Green
    $global:dTotal = $d.data.todayOrders.total
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nTEST 2: Kitchen API" -ForegroundColor Yellow
try {
    $k = Invoke-RestMethod -Uri "http://localhost:5000/api/meals/owner/aggregated" -Headers $headers
    Write-Host "Kitchen:   Lunch=$($k.orderSummary.Lunch) Dinner=$($k.orderSummary.Dinner) Total=$($k.orderSummary.Total)" -ForegroundColor Green
    $global:kTotal = $k.orderSummary.Total
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($global:dTotal -eq $global:kTotal) {
    Write-Host "SUCCESS: Counts are IDENTICAL!" -ForegroundColor Green
    if ($global:dTotal -le 12) {
        Write-Host "Count looks CORRECT (12 or less for 6 users)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Count is HIGH ($global:dTotal)" -ForegroundColor Yellow
        Write-Host "Expected around 12 for 6 users" -ForegroundColor Yellow
    }
} else {
    Write-Host "FAILURE: Counts do NOT match!" -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan
