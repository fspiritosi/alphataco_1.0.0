# Script para ejecutar tests de Cypress en Windows
# Uso: .\scripts\run-tests.ps1 [modo]
# Modos: open, run, headless

param(
    [string]$Mode = "open"
)

Write-Host "🚀 Iniciando tests de Cypress en modo: $Mode" -ForegroundColor Green

# Verificar que la aplicación esté corriendo
Write-Host "📡 Verificando que la aplicación esté corriendo..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Aplicación detectada" -ForegroundColor Green
}
catch {
    Write-Host "❌ La aplicación no está corriendo en http://localhost:3000" -ForegroundColor Red
    Write-Host "Por favor, ejecuta 'npm run dev' en otra terminal" -ForegroundColor Yellow
    exit 1
}

# Verificar que exista el archivo de configuración
if (-not (Test-Path "cypress.env.json")) {
    Write-Host "⚠️  No se encontró cypress.env.json" -ForegroundColor Yellow
    Write-Host "Creando desde cypress.env.example.json..." -ForegroundColor Yellow
    Copy-Item "cypress.env.example.json" "cypress.env.json"
    Write-Host "⚠️  Por favor, edita cypress.env.json con tus credenciales de prueba" -ForegroundColor Yellow
    exit 1
}

# Ejecutar tests según el modo
switch ($Mode) {
    "open" {
        Write-Host "🎬 Abriendo Cypress en modo interactivo..." -ForegroundColor Cyan
        npm run cypress
    }
    { $_ -in "run", "headless" } {
        Write-Host "🏃 Ejecutando tests en modo headless..." -ForegroundColor Cyan
        npm run cypress:headless
    }
    default {
        Write-Host "❌ Modo desconocido: $Mode" -ForegroundColor Red
        Write-Host "Modos disponibles: open, run, headless" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Tests completados" -ForegroundColor Green
