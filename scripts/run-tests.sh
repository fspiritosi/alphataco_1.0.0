#!/bin/bash

# Script para ejecutar tests de Cypress
# Uso: ./scripts/run-tests.sh [modo]
# Modos: open, run, headless

MODE=${1:-open}

echo "🚀 Iniciando tests de Cypress en modo: $MODE"

# Verificar que la aplicación esté corriendo
echo "📡 Verificando que la aplicación esté corriendo..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ La aplicación no está corriendo en http://localhost:3000"
    echo "Por favor, ejecuta 'npm run dev' en otra terminal"
    exit 1
fi

echo "✅ Aplicación detectada"

# Verificar que exista el archivo de configuración
if [ ! -f "cypress.env.json" ]; then
    echo "⚠️  No se encontró cypress.env.json"
    echo "Creando desde cypress.env.example.json..."
    cp cypress.env.example.json cypress.env.json
    echo "⚠️  Por favor, edita cypress.env.json con tus credenciales de prueba"
    exit 1
fi

# Ejecutar tests según el modo
case $MODE in
    open)
        echo "🎬 Abriendo Cypress en modo interactivo..."
        npm run cypress
        ;;
    run|headless)
        echo "🏃 Ejecutando tests en modo headless..."
        npm run cypress:headless
        ;;
    *)
        echo "❌ Modo desconocido: $MODE"
        echo "Modos disponibles: open, run, headless"
        exit 1
        ;;
esac

echo "✅ Tests completados"
