import PDFDocument from 'pdfkit';
import { type Response } from 'express';

interface ProductInfo {
    modelNumber: string;
    brand: string;
    serialNumber: string;
}

interface OrderItemInfo {
    quantity: number;
    unitPrice: string;
    taxRate: string;
    totalAmount: string;
    product: ProductInfo;
}

interface InvoiceData {
    invoiceNumber: string;
    customerName: string;
    customerGstin?: string | null;
    subtotal: string;
    taxAmount: string;
    grandTotal: string;
    createdAt: Date | string;
    items: OrderItemInfo[];
}

export const generateInvoicePdf = (doc: typeof PDFDocument, invoice: InvoiceData, res: Response): void => {
    // 1. Set response headers for PDF download/inline display
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);

    doc.pipe(res);

    // 2. Header Section (Seller Info & Invoice Title)
    doc
        .fontSize(20)
        .text('GURUKIRPA AUTOMATION WORKS', { align: 'left' })
        .fontSize(10)
        .text('Industrial Drives, Motors & Control Gear', { align: 'left' })
        .text('Email: support@gurukirpa-automation.com | Phone: +91-9876543210', { align: 'left' })
        .moveDown(1.5);

    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(1);

    // 3. Invoice Metadata & Customer Info (Two Columns)
    const metaY = doc.y;

    // Left Column: Customer Details
    doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Billed To:', 50, metaY)
        .font('Helvetica')
        .fontSize(10)
        .text(invoice.customerName)
        .text(`GSTIN: ${invoice.customerGstin || 'N/A'}`);

    // Right Column: Invoice Details
    doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 350, metaY)
        .font('Helvetica')
        .fontSize(10)
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`)
        .moveDown(2);

    // 4. Line Items Table Header
    const tableTop = doc.y + 15;
    doc.fontSize(10);

    doc
        .text('Item / Model', 50, tableTop, { width: 180 })
        .text('Qty', 240, tableTop, { width: 40, align: 'right' })
        .text('Unit Price (₹)', 290, tableTop, { width: 80, align: 'right' })
        .text('Tax (%)', 380, tableTop, { width: 60, align: 'right' })
        .text('Total (₹)', 450, tableTop, { width: 90, align: 'right' });

    doc
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .moveTo(50, tableTop + 15)
        .lineTo(540, tableTop + 15)
        .stroke();

    // 5. Line Items Rows
    let currentY = tableTop + 25;

    invoice.items.forEach((item) => {
        doc
            .text(`${item.product.brand} - ${item.product.modelNumber}`, 50, currentY, { width: 180 })
            .text(String(item.quantity), 240, currentY, { width: 40, align: 'right' })
            .text(Number(item.unitPrice).toFixed(2), 290, currentY, { width: 80, align: 'right' })
            .text(`${item.taxRate}%`, 380, currentY, { width: 60, align: 'right' })
            .text(Number(item.totalAmount).toFixed(2), 450, currentY, { width: 90, align: 'right' });

        currentY += 20;
    });

    doc
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .moveTo(50, currentY)
        .lineTo(540, currentY)
        .stroke();

    // 6. Totals Summary
    const summaryY = currentY + 15;

    doc
        .fontSize(10)
        .text('Subtotal:', 350, summaryY, { width: 90, align: 'right' })
        .text(`₹${Number(invoice.subtotal).toFixed(2)}`, 450, summaryY, { width: 90, align: 'right' })
        .text('Tax (GST):', 350, summaryY + 15, { width: 90, align: 'right' })
        .text(`₹${Number(invoice.taxAmount).toFixed(2)}`, 450, summaryY + 15, { width: 90, align: 'right' });

    doc
        .fontSize(11)
        .text('Grand Total:', 350, summaryY + 35, { width: 90, align: 'right' })
        .text(`₹${Number(invoice.grandTotal).toFixed(2)}`, 450, summaryY + 35, { width: 90, align: 'right' });

    // 7. Footer
    doc
        .fontSize(9)
        .text('Thank you for doing business with GuruKirpa Automation Works!', 50, 720, {
            align: 'center',
            width: 500,
        });

    doc.end();
};