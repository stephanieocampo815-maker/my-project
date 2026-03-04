$csv = Import-Csv 'coffee_shop_data.csv'

foreach($row in $csv) {
  $date = [datetime]::ParseExact($row.Date, 'M/d/yyyy', $null)
  $month = $date.Month
  
  # Expense multiplier based on month - simulating increasing operational costs
  if($month -eq 1) { $factor = 1.0 }      # January - baseline
  elseif($month -eq 2) { $factor = 1.2 }  # February - 20% increase
  elseif($month -eq 3) { $factor = 1.35 } # March - 35% increase
  else { $factor = 1.5 }                   # April+ - 50% increase
  
  # Increase operating and marketing expenses
  $row.'Operating Expenses' = [math]::Round([decimal]$row.'Operating Expenses' * $factor, 2)
  $row.'Marketing Expenses' = [math]::Round([decimal]$row.'Marketing Expenses' * $factor, 2)
  
  # Recalculate derived fields
  $cogs = [decimal]$row.COGS
  $revenue = [decimal]$row.'Total Revenue'
  $opex = [decimal]$row.'Operating Expenses'
  $mktex = [decimal]$row.'Marketing Expenses'
  
  $row.'Total Cost' = [math]::Round($cogs + $opex + $mktex, 2)
  $row.'Net Income' = [math]::Round($revenue - [decimal]$row.'Total Cost', 2)
  
  if($revenue -gt 0) {
    $row.'Profit Margin' = [math]::Round([decimal]$row.'Net Income' / $revenue, 10)
  } else {
    $row.'Profit Margin' = 0
  }
}

$csv | Export-Csv 'coffee_shop_data.csv' -NoTypeInformation -Encoding UTF8

Write-Host "CSV updated with declining profit trend!" -ForegroundColor Green
Write-Host "Scenario: Increasing operational and marketing expenses" -ForegroundColor Green
Write-Host "  Jan: Baseline | Feb: +20% | Mar: +35% | Apr+: +50%" -ForegroundColor Yellow
Write-Host "Result: Profit margins decline while sales remain stable" -ForegroundColor Cyan
