param(
 [Parameter(Mandatory=$true)][string]$WorkerUrl,
 [string]$Franquia = '',
 [switch]$Renovar
)
$ErrorActionPreference = 'Stop'
$api = $WorkerUrl.TrimEnd('/')
if (-not $api.StartsWith('https://')) { throw 'Use a URL HTTPS do seu Worker de palpites.' }
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$catalog = Get-Content -LiteralPath (Join-Path $repo 'assets/palpites/schema.json') -Raw -Encoding utf8 | ConvertFrom-Json
$teams = @($catalog.teams | Where-Object { -not $Franquia -or $_.id -eq $Franquia })
if (-not $teams.Count) { throw 'Franquia não encontrada. Use o id listado em assets/palpites/schema.json.' }
if ($Renovar -and -not $Franquia) { throw 'Para renovar, indique uma única -Franquia. Os palpites serão preservados.' }
$health = Invoke-RestMethod -Uri "$api/health"
if (-not $health.ok -or -not $health.deadline) { throw 'Configure DB, schema.sql e DEADLINE antes de gerar os convites.' }
$secret = Read-Host 'Cole o ADMIN_KEY cadastrado no Cloudflare (fica oculto)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$links = [Collections.Generic.List[object]]::new()
$outputPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) ('Downloads/airball-convites-privados-'+[DateTime]::Now.ToString('yyyyMMdd-HHmmss')+'.json')
try {
 $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
 foreach ($t in $teams) {
  $body = @{teamId=$t.id;rotate=[bool]$Renovar} | ConvertTo-Json
  $result = Invoke-RestMethod -Uri "$api/admin/invites" -Method Post -Headers @{Authorization="Bearer $key"} -ContentType 'application/json' -Body $body
  if ($result.link) { $links.Add($result); ConvertTo-Json -InputObject @($links.ToArray()) -Depth 5 | Set-Content -LiteralPath $outputPath -Encoding utf8 }
 }
 @{apiUrl=$api} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $repo 'assets/palpites/config.json') -Encoding utf8
 Write-Host 'Conexão configurada. Publique assets/palpites/config.json junto com o site.'
 if ($links.Count) { Write-Host "Links privados salvos em: $outputPath" } else { Write-Host 'Os convites já existem. Use o arquivo privado gerado anteriormente.' }
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $key=$null; $secret=$null }

