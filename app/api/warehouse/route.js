import { NextResponse } from "next/server";
import {
  query,
  queryOne,
  queryRows,
  serializeProduct
} from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAllProducts() {
  const products = await queryRows(`
    SELECT
      id,
      name,
      category,
      total_quantity,
      unit,
      description,
      low_stock_threshold,
      created_at
    FROM products
    ORDER BY created_at DESC
  `);

  return products.map(serializeProduct);
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
    const category = body.category?.trim();
    const unit = body.unit?.trim();
    const description = body.description?.trim() || "";
    const totalQuantity = Number(body.total_quantity);
    const lowStockThreshold = Number(body.low_stock_threshold);

    if (!name || !category || !unit) {
      return NextResponse.json(
        { message: "Name, category, and unit are required." },
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

    const product = await queryOne(
      `
        INSERT INTO products (
          name,
          category,
          total_quantity,
          unit,
          description,
          low_stock_threshold,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING
          id,
          name,
          category,
          total_quantity,
          unit,
          description,
          low_stock_threshold,
          created_at
      `,
      [name, category, totalQuantity, unit, description, lowStockThreshold]
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
    const category = body.category?.trim();
    const unit = body.unit?.trim();
    const description = body.description?.trim() || "";
    const totalQuantity = Number(body.total_quantity);
    const lowStockThreshold = Number(body.low_stock_threshold);

    if (!name || !category || !unit) {
      return NextResponse.json(
        { message: "Name, category, and unit are required." },
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

    const updatedProduct = await queryOne(
      `
        UPDATE products
        SET
          name = $1,
          category = $2,
          total_quantity = $3,
          unit = $4,
          description = $5,
          low_stock_threshold = $6
        WHERE id = $7
        RETURNING
          id,
          name,
          category,
          total_quantity,
          unit,
          description,
          low_stock_threshold,
          created_at
      `,
      [
        name,
        category,
        totalQuantity,
        unit,
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
