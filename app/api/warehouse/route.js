import { NextResponse } from "next/server";
import {
  query,
  queryOne,
  queryRows,
  serializeProduct
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { DEFAULT_STORAGE_LOCATION } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAllProducts() {
  const products = await queryRows(`
    SELECT
      id,
      name,
      sku,
      barcode,
      category,
      total_quantity,
      unit,
      storage_location,
      description,
      low_stock_threshold,
      created_at
    FROM products
    ORDER BY created_at DESC
  `);

  return products.map(serializeProduct);
}

function normalizeSku(value) {
  return value?.trim().toUpperCase() || "";
}

function normalizeBarcode(value) {
  const barcode = value?.trim();
  return barcode || null;
}

function normalizeStorageLocation(value) {
  return value?.trim() || DEFAULT_STORAGE_LOCATION;
}

export async function GET(request) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const products = await getAllProducts();

  if (view === "dashboard") {
    const categoryMap = products.reduce((accumulator, product) => {
      accumulator[product.category] =
        (accumulator[product.category] || 0) + product.total_quantity;
      return accumulator;
    }, {});

    return NextResponse.json({
      totalProducts: products.length,
      totalUnits: products.reduce(
        (sum, product) => sum + product.total_quantity,
        0
      ),
      lowStockCount: products.filter((product) => product.low_stock).length,
      categoryChart: Object.entries(categoryMap).map(([category, quantity]) => ({
        category,
        quantity
      })),
      products
    });
  }

  return NextResponse.json({ products });
}

export async function POST(request) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const name = body.name?.trim();
    const sku = normalizeSku(body.sku);
    const barcode = normalizeBarcode(body.barcode);
    const category = body.category?.trim();
    const unit = body.unit?.trim();
    const storageLocation = normalizeStorageLocation(body.storage_location);
    const description = body.description?.trim() || "";
    const totalQuantity = Number(body.total_quantity);
    const lowStockThreshold = Number(body.low_stock_threshold);

    if (!name || !sku || !category || !unit || !storageLocation) {
      return NextResponse.json(
        {
          message:
            "Name, SKU, category, unit, and storage location are required."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(totalQuantity) ||
      totalQuantity < 0 ||
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      return NextResponse.json(
        { message: "Quantities must be whole numbers greater than or equal to zero." },
        { status: 400 }
      );
    }

    const existing = await queryOne(
      "SELECT id FROM products WHERE name = $1",
      [name]
    );

    if (existing) {
      return NextResponse.json(
        { message: "A product with this name already exists." },
        { status: 409 }
      );
    }

    const existingSku = await queryOne(
      "SELECT id FROM products WHERE LOWER(sku) = LOWER($1)",
      [sku]
    );

    if (existingSku) {
      return NextResponse.json(
        { message: "Another product already uses this SKU." },
        { status: 409 }
      );
    }

    if (barcode) {
      const existingBarcode = await queryOne(
        "SELECT id FROM products WHERE LOWER(barcode) = LOWER($1)",
        [barcode]
      );

      if (existingBarcode) {
        return NextResponse.json(
          { message: "Another product already uses this barcode." },
          { status: 409 }
        );
      }
    }

    const product = await queryOne(
      `
        INSERT INTO products (
          name,
          sku,
          barcode,
          category,
          total_quantity,
          unit,
          storage_location,
          description,
          low_stock_threshold,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING
          id,
          name,
          sku,
          barcode,
          category,
          total_quantity,
          unit,
          storage_location,
          description,
          low_stock_threshold,
          created_at
      `,
      [
        name,
        sku,
        barcode,
        category,
        totalQuantity,
        unit,
        storageLocation,
        description,
        lowStockThreshold
      ]
    );

    return NextResponse.json(
      {
        message: "Product added to warehouse.",
        product: serializeProduct(product)
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to create product." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    const product = await queryOne(
      "SELECT id FROM products WHERE id = $1",
      [id]
    );

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    const name = body.name?.trim();
    const sku = normalizeSku(body.sku);
    const barcode = normalizeBarcode(body.barcode);
    const category = body.category?.trim();
    const unit = body.unit?.trim();
    const storageLocation = normalizeStorageLocation(body.storage_location);
    const description = body.description?.trim() || "";
    const totalQuantity = Number(body.total_quantity);
    const lowStockThreshold = Number(body.low_stock_threshold);

    if (!name || !sku || !category || !unit || !storageLocation) {
      return NextResponse.json(
        {
          message:
            "Name, SKU, category, unit, and storage location are required."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(totalQuantity) ||
      totalQuantity < 0 ||
      !Number.isInteger(lowStockThreshold) ||
      lowStockThreshold < 0
    ) {
      return NextResponse.json(
        { message: "Quantities must be whole numbers greater than or equal to zero." },
        { status: 400 }
      );
    }

    const nameConflict = await queryOne(
      "SELECT id FROM products WHERE name = $1 AND id != $2",
      [name, id]
    );

    if (nameConflict) {
      return NextResponse.json(
        { message: "Another product already uses this name." },
        { status: 409 }
      );
    }

    const skuConflict = await queryOne(
      "SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id != $2",
      [sku, id]
    );

    if (skuConflict) {
      return NextResponse.json(
        { message: "Another product already uses this SKU." },
        { status: 409 }
      );
    }

    if (barcode) {
      const barcodeConflict = await queryOne(
        "SELECT id FROM products WHERE LOWER(barcode) = LOWER($1) AND id != $2",
        [barcode, id]
      );

      if (barcodeConflict) {
        return NextResponse.json(
          { message: "Another product already uses this barcode." },
          { status: 409 }
        );
      }
    }

    const updatedProduct = await queryOne(
      `
        UPDATE products
        SET
          name = $1,
          sku = $2,
          barcode = $3,
          category = $4,
          total_quantity = $5,
          unit = $6,
          storage_location = $7,
          description = $8,
          low_stock_threshold = $9
        WHERE id = $10
        RETURNING
          id,
          name,
          sku,
          barcode,
          category,
          total_quantity,
          unit,
          storage_location,
          description,
          low_stock_threshold,
          created_at
      `,
      [
        name,
        sku,
        barcode,
        category,
        totalQuantity,
        unit,
        storageLocation,
        description,
        lowStockThreshold,
        id
      ]
    );

    return NextResponse.json({
      message: "Product updated successfully.",
      product: serializeProduct(updatedProduct)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const { response } = await requireSession("admin");

  if (response) {
    return response;
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    const product = await queryOne(
      "SELECT id FROM products WHERE id = $1",
      [id]
    );

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    const assignments = await queryOne(
      "SELECT COUNT(*) AS count FROM user_inventory WHERE product_id = $1",
      [id]
    );

    if (Number(assignments.count || 0) > 0) {
      return NextResponse.json(
        { message: "Remove this product from employees before deleting it." },
        { status: 400 }
      );
    }

    const records = await queryOne(
      "SELECT COUNT(*) AS count FROM records WHERE product_id = $1",
      [id]
    );

    if (Number(records.count || 0) > 0) {
      return NextResponse.json(
        {
          message:
            "This product has inventory history. Keep it for audit purposes instead of deleting it."
        },
        { status: 400 }
      );
    }

    await query("DELETE FROM products WHERE id = $1", [id]);

    return NextResponse.json({
      message: "Product deleted successfully."
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to delete product." },
      { status: 500 }
    );
  }
}
