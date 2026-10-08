param(
  [Parameter(Mandatory = $true)][string]$Repository,
  [Parameter(Mandatory = $true)][string]$Ref
)
$ErrorActionPreference = 'Stop'
if ($Repository -notmatch '^[\w.-]+/[\w.-]+$' -or $Ref -notmatch '^[\w./-]{1,100}$' -or $Ref.Contains('..')) { throw 'Geçersiz depo veya ref.' }
Add-Type -AssemblyName System.IO.Compression
$headers = @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'ai-corp-local'; 'X-GitHub-Api-Version' = '2022-11-28' }
if ($env:AI_CORP_GITHUB_TOKEN) { $headers.Authorization = "Bearer $env:AI_CORP_GITHUB_TOKEN" }
$encodedRef = [uri]::EscapeDataString($Ref)
$commit = (Invoke-RestMethod "https://api.github.com/repos/$Repository/commits/$encodedRef" -Headers $headers).sha
$license = Invoke-RestMethod "https://api.github.com/repos/$Repository/license?ref=$commit" -Headers $headers
$spdx = $license.license.spdx_id
if (-not $spdx -or $spdx -eq 'NOASSERTION') { throw 'Lisans doğrulanamadı; otomatik içe aktarma durduruldu.' }
$slug = $Repository.Replace('/', '__') + '__' + $commit.Substring(0, 12)
$archiveDir = Join-Path $PSScriptRoot 'archives'
$extractDir = Join-Path $PSScriptRoot 'extracted'
$archive = Join-Path $archiveDir "$slug.zip"
$target = Join-Path $extractDir $slug
New-Item -ItemType Directory -Force -Path $archiveDir, $extractDir, $target | Out-Null
Invoke-WebRequest "https://api.github.com/repos/$Repository/zipball/$commit" -Headers $headers -OutFile $archive
$sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
$zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
try {
  if ($zip.Entries.Count -gt 20000) { throw 'Arşivde çok fazla dosya var.' }
  $totalSize = ($zip.Entries | Measure-Object -Property Length -Sum).Sum
  if ($totalSize -gt 536870912) { throw 'Arşiv 512 MB sınırını aşıyor.' }
  $prefix = $zip.Entries[0].FullName.Split('/')[0] + '/'
  $targetFull = [System.IO.Path]::GetFullPath($target)
  foreach ($entry in $zip.Entries) {
    if (-not $entry.FullName.StartsWith($prefix, [StringComparison]::Ordinal)) { throw 'Arşiv kökü tutarsız.' }
    $relative = $entry.FullName.Substring($prefix.Length)
    if (-not $relative -or $relative.EndsWith('/')) { continue }
    $unixMode = ($entry.ExternalAttributes -shr 16) -band 61440
    if ($unixMode -eq 40960) { throw 'Sembolik bağlantı içeren arşiv reddedildi.' }
    $destination = [System.IO.Path]::GetFullPath((Join-Path $targetFull $relative))
    if (-not $destination.StartsWith($targetFull + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Arşivde güvensiz yol.' }
    $parent = [System.IO.Path]::GetDirectoryName($destination)
    [System.IO.Directory]::CreateDirectory($parent) | Out-Null
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $true)
  }
} finally { $zip.Dispose() }
$catalogPath = Join-Path $PSScriptRoot 'catalog.json'
$catalog = @((Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json) | Where-Object { $_.repository -ne $Repository -or $_.commit -ne $commit })
$entry = [ordered]@{
  repository = $Repository; commit = $commit; license_spdx = $spdx; license_url = $license.html_url
  archive_sha256 = $sha; archive = "archives/$slug.zip"; extracted = "extracted/$slug"; copied_files = @()
}
$catalog += $entry
$temporary = "$catalogPath.tmp"
ConvertTo-Json -InputObject @($catalog) -Depth 10 | Set-Content -LiteralPath $temporary -Encoding utf8
Move-Item -LiteralPath $temporary -Destination $catalogPath -Force
$entry | ConvertTo-Json -Depth 10
