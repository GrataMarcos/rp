#!/bin/bash
# ─────────────────────────────────────────────────────────────
# build.sh — Empaqueta el bot para AWS Lambda
# Genera lambda.zip listo para subir a la consola o via CLI
# ─────────────────────────────────────────────────────────────
set -e

PACKAGE_DIR="package"
ZIP_NAME="lambda.zip"

echo "🧹 Limpiando build anterior..."
rm -rf "$PACKAGE_DIR" "$ZIP_NAME"
mkdir "$PACKAGE_DIR"

echo "📦 Instalando dependencias..."
pip install -r requirements.txt -t "$PACKAGE_DIR" --quiet

echo "📁 Copiando código fuente..."
cp lambda_function.py "$PACKAGE_DIR/"
cp -r handlers/ services/ utils/ "$PACKAGE_DIR/"

echo "🗜️  Creando zip..."
cd "$PACKAGE_DIR"
zip -r "../$ZIP_NAME" . -q
cd ..

echo "✅ Listo: $ZIP_NAME ($(du -sh $ZIP_NAME | cut -f1))"
echo ""
echo "Para subir a Lambda:"
echo "  aws lambda update-function-code --function-name <nombre> --zip-file fileb://$ZIP_NAME"
