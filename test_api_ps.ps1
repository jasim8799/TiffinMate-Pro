# Test API Endpoints with PowerShell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZhMmFiM2Y1ZTZiYWUyYTcwYjk4ZjYiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3MzU4NzYzNzQsImV4cCI6MTczNjQ4MTE3NH0.aP4jtNZ43O3CY9Aq3D-q04AiPJNBSd43Y0wJOtMZ4_o"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n$('='*70)" -ForegroundColor Cyan
Write-Host "🧪 TESTING ACTUAL API ENDPOINTS" -ForegroundColor Cyan
Write-Host "$('='*70)`n" -ForegroundColor Cyan

# Test Dashboard API
Write-Host "$('━'*70)" -ForegroundColor Yellow
Write-Host "📊 TEST 1: DASHBOARD API" -ForegroundColor Yellow
Write-Host "$('━'*70)" -ForegroundColor Yellow

try {
    $dashboard = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/dashboard" -Headers $headers -Method Get
    Write-Host "`n✅ Dashboard Response:" -ForegroundColor Green
    Write-Host "   Today Orders: $($dashboard.data.todayOrders | ConvertTo-Json -Compress)"
    Write-Host "   - Lunch:  $($dashboard.data.todayOrders.lunch)" -ForegroundColor White
    Write-Host "   - Dinner: $($dashboard.data.todayOrders.dinner)" -ForegroundColor White
    Write-Host "   - Total:  $($dashboard.data.todayOrders.total)" -ForegroundColor White
    
    $global:dashboardCounts = $dashboard.data.todayOrders
} catch {
    Write-Host "`n❌ Dashboard API Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Kitchen API
Write-Host "`n$('━'*70)" -ForegroundColor Yellow
Write-Host "🍽️  TEST 2: KITCHEN API" -ForegroundColor Yellow
Write-Host "$('━'*70)" -ForegroundColor Yellow

try {
    $kitchen = Invoke-RestMethod -Uri "http://localhost:5000/api/meals/owner/aggregated" -Headers $headers -Method Get
    Write-Host "`n✅ Kitchen Response:" -ForegroundColor Green
    Write-Host "   Order Summary: $($kitchen.orderSummary | ConvertTo-Json -Compress)"
    Write-Host "   - Lunch:  $($kitchen.orderSummary.Lunch)" -ForegroundColor White
    Write-Host "   - Dinner: $($kitchen.orderSummary.Dinner)" -ForegroundColor White
    Write-Host "   - Total:  $($kitchen.orderSummary.Total)" -ForegroundColor White
    
    $global:kitchenCounts = $kitchen.orderSummary
} catch {
    Write-Host "`n❌ Kitchen API Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Comparison
if ($global:dashboardCounts -and $global:kitchenCounts) {
    Write-Host "`n$('='*70)" -ForegroundColor Cyan
    Write-Host "🎯 FINAL VERIFICATION: Dashboard vs Kitchen" -ForegroundColor Cyan
    Write-Host "$('='*70)" -ForegroundColor Cyan
    
    Write-Host "`n📊 Dashboard:" -ForegroundColor White
    Write-Host "   Lunch:  $($global:dashboardCounts.lunch)"
    Write-Host "   Dinner: $($global:dashboardCounts.dinner)"
    Write-Host "   Total:  $($global:dashboardCounts.total)"
    
    Write-Host "`n🍽️  Kitchen:" -ForegroundColor White
    Write-Host "   Lunch:  $($global:kitchenCounts.Lunch)"
    Write-Host "   Dinner: $($global:kitchenCounts.Dinner)"
    Write-Host "   Total:  $($global:kitchenCounts.Total)"
    
    $lunchMatch = $global:dashboardCounts.lunch -eq $global:kitchenCounts.Lunch
    $dinnerMatch = $global:dashboardCounts.dinner -eq $global:kitchenCounts.Dinner
    $totalMatch = $global:dashboardCounts.total -eq $global:kitchenCounts.Total
    
    Write-Host "`n$('━'*70)" -ForegroundColor Yellow
    Write-Host "COMPARISON RESULTS:" -ForegroundColor Yellow
    Write-Host "$('━'*70)" -ForegroundColor Yellow
    
    $lunchIcon = if ($lunchMatch) { "✅" } else { "❌" }
    $dinnerIcon = if ($dinnerMatch) { "✅" } else { "❌" }
    $totalIcon = if ($totalMatch) { "✅" } else { "❌" }
    
    Write-Host "   $lunchIcon Lunch:  Dashboard=$($global:dashboardCounts.lunch) vs Kitchen=$($global:kitchenCounts.Lunch)"
    Write-Host "   $dinnerIcon Dinner: Dashboard=$($global:dashboardCounts.dinner) vs Kitchen=$($global:kitchenCounts.Dinner)"
    Write-Host "   $totalIcon Total:  Dashboard=$($global:dashboardCounts.total) vs Kitchen=$($global:kitchenCounts.Total)"
    
    Write-Host "`n$('='*70)" -ForegroundColor Cyan
    if ($lunchMatch -and $dinnerMatch -and $totalMatch) {
        Write-Host "✅ ✅ ✅ SUCCESS: COUNTS ARE IDENTICAL! ✅ ✅ ✅" -ForegroundColor Green
        Write-Host "Dashboard and Kitchen now show the SAME data!" -ForegroundColor Green
    } else {
        Write-Host "❌ ❌ ❌ FAILURE: COUNTS DO NOT MATCH! ❌ ❌ ❌" -ForegroundColor Red
        Write-Host "This should NOT happen with single source of truth!" -ForegroundColor Red
    }
    Write-Host "$('='*70)`n" -ForegroundColor Cyan
}
