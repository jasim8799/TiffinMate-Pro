# Test API Endpoints - TODAY ONLY Verification

Write-Host "`n$('='*80)" -ForegroundColor Cyan
Write-Host "🧪 TODAY-ONLY MEALS - API ENDPOINT VERIFICATION" -ForegroundColor Cyan
Write-Host "$('='*80)`n" -ForegroundColor Cyan

$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzZhMmFiM2Y1ZTZiYWUyYTcwYjk4ZjYiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3MzU4NzYzNzQsImV4cCI6MTczNjQ4MTE3NH0.aP4jtNZ43O3CY9Aq3D-q04AiPJNBSd43Y0wJOtMZ4_o"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 1: Dashboard API
Write-Host "$('━'*80)" -ForegroundColor Yellow
Write-Host "📊 TEST 1: DASHBOARD API (Today's Meals)" -ForegroundColor Yellow
Write-Host "$('━'*80)" -ForegroundColor Yellow

try {
    $dashboard = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/dashboard" -Headers $headers -Method Get -ErrorAction Stop
    
    Write-Host "`n✅ Dashboard API Response:" -ForegroundColor Green
    Write-Host "   Today Orders:"
    Write-Host "   - Lunch:  $($dashboard.data.todayOrders.lunch)" -ForegroundColor White
    Write-Host "   - Dinner: $($dashboard.data.todayOrders.dinner)" -ForegroundColor White
    Write-Host "   - Total:  $($dashboard.data.todayOrders.total)" -ForegroundColor White
    
    $global:dashboardLunch = $dashboard.data.todayOrders.lunch
    $global:dashboardDinner = $dashboard.data.todayOrders.dinner
    $global:dashboardTotal = $dashboard.data.todayOrders.total
    
} catch {
    Write-Host "`n❌ Dashboard API Error:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n⚠️  Make sure backend is running: npm start" -ForegroundColor Yellow
    exit 1
}

# Test 2: Kitchen API
Write-Host "`n$('━'*80)" -ForegroundColor Yellow
Write-Host "🍽️  TEST 2: KITCHEN API (Today's Meals)" -ForegroundColor Yellow
Write-Host "$('━'*80)" -ForegroundColor Yellow

try {
    $kitchen = Invoke-RestMethod -Uri "http://localhost:5000/api/meals/owner/aggregated" -Headers $headers -Method Get -ErrorAction Stop
    
    Write-Host "`n✅ Kitchen API Response:" -ForegroundColor Green
    Write-Host "   Order Summary:"
    Write-Host "   - Lunch:  $($kitchen.orderSummary.Lunch)" -ForegroundColor White
    Write-Host "   - Dinner: $($kitchen.orderSummary.Dinner)" -ForegroundColor White
    Write-Host "   - Total:  $($kitchen.orderSummary.Total)" -ForegroundColor White
    
    $global:kitchenLunch = $kitchen.orderSummary.Lunch
    $global:kitchenDinner = $kitchen.orderSummary.Dinner
    $global:kitchenTotal = $kitchen.orderSummary.Total
    
} catch {
    Write-Host "`n❌ Kitchen API Error:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verification
Write-Host "`n$('='*80)" -ForegroundColor Cyan
Write-Host "🎯 VERIFICATION: Dashboard vs Kitchen (Must Be IDENTICAL)" -ForegroundColor Cyan
Write-Host "$('='*80)" -ForegroundColor Cyan

Write-Host "`n📊 Dashboard Results:" -ForegroundColor White
Write-Host "   Lunch:  $global:dashboardLunch"
Write-Host "   Dinner: $global:dashboardDinner"
Write-Host "   Total:  $global:dashboardTotal"

Write-Host "`n🍽️  Kitchen Results:" -ForegroundColor White
Write-Host "   Lunch:  $global:kitchenLunch"
Write-Host "   Dinner: $global:kitchenDinner"
Write-Host "   Total:  $global:kitchenTotal"

# Comparison
$lunchMatch = $global:dashboardLunch -eq $global:kitchenLunch
$dinnerMatch = $global:dashboardDinner -eq $global:kitchenDinner
$totalMatch = $global:dashboardTotal -eq $global:kitchenTotal

Write-Host "`n$('━'*80)" -ForegroundColor Yellow
Write-Host "COMPARISON RESULTS:" -ForegroundColor Yellow
Write-Host "$('━'*80)" -ForegroundColor Yellow

$lunchIcon = if ($lunchMatch) { "✅" } else { "❌" }
$dinnerIcon = if ($dinnerMatch) { "✅" } else { "❌" }
$totalIcon = if ($totalMatch) { "✅" } else { "❌" }

Write-Host "`n   $lunchIcon Lunch Match:  Dashboard=$global:dashboardLunch vs Kitchen=$global:kitchenLunch"
Write-Host "   $dinnerIcon Dinner Match: Dashboard=$global:dashboardDinner vs Kitchen=$global:kitchenDinner"
Write-Host "   $totalIcon Total Match:  Dashboard=$global:dashboardTotal vs Kitchen=$global:kitchenTotal"

# Expected Values
Write-Host "`n$('━'*80)" -ForegroundColor Yellow
Write-Host "EXPECTED VALUES (for 6 active users):" -ForegroundColor Yellow
Write-Host "$('━'*80)" -ForegroundColor Yellow
Write-Host "   Expected Lunch:  ~6 (one per user, if all selected)"
Write-Host "   Expected Dinner: ~6 (one per user, if all selected)"
Write-Host "   Expected Total:  ~12 (6 users × 2 meals max)"
Write-Host "`n   ⚠️  Actual counts may be less if some users skipped meals"

# Final Result
Write-Host "`n$('='*80)" -ForegroundColor Cyan
if ($lunchMatch -and $dinnerMatch -and $totalMatch) {
    Write-Host "✅ ✅ ✅ SUCCESS: COUNTS ARE IDENTICAL! ✅ ✅ ✅" -ForegroundColor Green
    Write-Host "Dashboard and Kitchen show the SAME TODAY-ONLY meals!" -ForegroundColor Green
    
    # Check for inflated counts
    if ($global:dashboardTotal -gt 18) {
        Write-Host "`n⚠️  WARNING: Total count ($global:dashboardTotal) seems HIGH!" -ForegroundColor Yellow
        Write-Host "   This might indicate tomorrow's meals are still included." -ForegroundColor Yellow
        Write-Host "   Expected: ~12 for 6 users (max 2 meals each)" -ForegroundColor Yellow
    } elseif ($global:dashboardTotal -ge 10 -and $global:dashboardTotal -le 12) {
        Write-Host "`n✅ Count looks CORRECT for 6 active users!" -ForegroundColor Green
    } else {
        Write-Host "`n✅ Count varies based on user meal selections." -ForegroundColor Green
    }
} else {
    Write-Host "❌ ❌ ❌ FAILURE: COUNTS DO NOT MATCH! ❌ ❌ ❌" -ForegroundColor Red
    Write-Host "This should NOT happen with TODAY-ONLY query!" -ForegroundColor Red
}
Write-Host "$('='*80)`n" -ForegroundColor Cyan
