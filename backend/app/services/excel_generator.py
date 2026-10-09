import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from backend.app.models import CosteoProcedimiento, CosteoFase

HEADER_FILL = PatternFill(start_color="006D87", end_color="006D87", fill_type="solid") # Deep Teal Hospital Quillabamba
SUBHEADER_FILL = PatternFill(start_color="E0F7FA", end_color="E0F7FA", fill_type="solid") # Cyan Tint
GRAY_FILL = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
ACCENT_FILL = PatternFill(start_color="E6F4F8", end_color="E6F4F8", fill_type="solid")

FONT_HEADER = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
FONT_BOLD = Font(name="Calibri", size=10, bold=True)
FONT_REGULAR = Font(name="Calibri", size=10)
FONT_TITLE = Font(name="Calibri", size=13, bold=True, color="0F172A")

BORDER_THIN = Border(
    left=Side(style='thin', color='CBD5E1'),
    right=Side(style='thin', color='CBD5E1'),
    top=Side(style='thin', color='CBD5E1'),
    bottom=Side(style='thin', color='CBD5E1')
)

def export_costing_sheet_excel(costeo: CosteoProcedimiento) -> io.BytesIO:
    """Genera el Excel oficial MODELO_HOJA_COSTEO estructurado por Actividades"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MODELO_HOJA_COSTEO"
    ws.views.sheetView[0].showGridLines = True

    # Header institucional
    ws.merge_cells("B2:J2")
    ws["B2"] = "HOJA DE COSTEO ESTÁNDAR UNITARIO POR PROCEDIMIENTO MÉDICO"
    ws["B2"].font = FONT_TITLE
    ws["B2"].alignment = Alignment(horizontal="center", vertical="center")

    ws["B4"] = "Unidad Productora de Servicio (UPSS):"
    ws["B4"].font = FONT_BOLD
    ws["D4"] = costeo.upss_servicio or "GENERAL"
    ws["D4"].font = FONT_REGULAR

    ws["B5"] = "Código de Procedimiento (CPMS):"
    ws["B5"].font = FONT_BOLD
    ws["D5"] = costeo.codigo_cpms
    ws["D5"].font = FONT_BOLD

    ws["B6"] = "Nombre de Procedimiento:"
    ws["B6"].font = FONT_BOLD
    ws["D6"] = costeo.nombre_procedimiento
    ws["D6"].font = FONT_REGULAR

    ws["B7"] = "Tiempo Total Estimado:"
    ws["B7"].font = FONT_BOLD
    ws["D7"] = f"{costeo.tiempo_total_minutos} minutos"
    ws["D7"].font = FONT_BOLD

    ws["B8"] = "Costo Total Estándar:"
    ws["B8"].font = FONT_BOLD
    ws["D8"] = f"S/. {costeo.costo_total_estandar:.3f}"
    ws["D8"].font = FONT_BOLD

    current_row = 10

    # Resumen de Actividades
    headers_resumen = ["Actividad", "Descripción de la Actividad", "Tiempo (min)", "Costo RRHH", "Costo Insumos", "Costo Equipos", "Subtotal Actividad"]
    for col_idx, h in enumerate(headers_resumen, 2):
        cell = ws.cell(row=current_row, column=col_idx, value=h)
        cell.font = FONT_HEADER
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER_THIN
    current_row += 1

    for idx, actividad in enumerate(costeo.fases, 1):
        nombre = actividad.nombre_fase or f"Actividad {idx}"
        ws.cell(row=current_row, column=2, value=nombre).font = FONT_BOLD
        ws.cell(row=current_row, column=3, value=actividad.descripcion_actividad or "")
        ws.cell(row=current_row, column=4, value=actividad.tiempo_minutos).alignment = Alignment(horizontal="right")
        ws.cell(row=current_row, column=5, value=actividad.subtotal_rrhh).alignment = Alignment(horizontal="right")
        ws.cell(row=current_row, column=6, value=actividad.subtotal_insumos).alignment = Alignment(horizontal="right")
        ws.cell(row=current_row, column=7, value=actividad.subtotal_equipos).alignment = Alignment(horizontal="right")
        ws.cell(row=current_row, column=8, value=actividad.subtotal_fase).font = FONT_BOLD
        ws.cell(row=current_row, column=8).alignment = Alignment(horizontal="right")
        for col_idx in range(2, 9):
            cell = ws.cell(row=current_row, column=col_idx)
            cell.border = BORDER_THIN
            if col_idx >= 5:
                cell.number_format = 'S/ #,##0.000'
        current_row += 1

    # Totales Directos de Actividades
    ws.cell(row=current_row, column=2, value="Total Directo Actividades").font = FONT_BOLD
    ws.cell(row=current_row, column=4, value=costeo.tiempo_total_minutos).font = FONT_BOLD
    ws.cell(row=current_row, column=5, value=costeo.costo_rrhh).font = FONT_BOLD
    ws.cell(row=current_row, column=6, value=costeo.costo_insumos).font = FONT_BOLD
    ws.cell(row=current_row, column=7, value=costeo.costo_equipos).font = FONT_BOLD
    ws.cell(row=current_row, column=8, value=costeo.costo_rrhh + costeo.costo_insumos + costeo.costo_equipos).font = FONT_BOLD
    for col_idx in range(2, 9):
        c = ws.cell(row=current_row, column=col_idx)
        c.border = BORDER_THIN
        c.fill = GRAY_FILL
        if col_idx >= 5:
            c.number_format = 'S/ #,##0.000'
    current_row += 3

    # Desglose Detallado por Actividad
    for idx, actividad in enumerate(costeo.fases, 1):
        nombre = actividad.nombre_fase or f"Actividad {idx}"
        ws.merge_cells(f"B{current_row}:H{current_row}")
        header_act = ws.cell(row=current_row, column=2, value=f"{nombre}: {actividad.descripcion_actividad or ''} ({actividad.tiempo_minutos} min)")
        header_act.font = FONT_HEADER
        header_act.fill = HEADER_FILL
        header_act.alignment = Alignment(horizontal="left", vertical="center")
        current_row += 1

        # RRHH
        if actividad.rrhh_items:
            ws.merge_cells(f"B{current_row}:H{current_row}")
            ws.cell(row=current_row, column=2, value="Recursos Humanos (RRHH)").font = FONT_BOLD
            ws.cell(row=current_row, column=2).fill = SUBHEADER_FILL
            current_row += 1

            headers_item = ["Código", "Grupo Ocupacional", "Tiempo (min)", "Cantidad", "Costo Unitario (S/./min)", "Costo Parcial (S/.)"]
            for col_idx, h in enumerate(headers_item, 2):
                c = ws.cell(row=current_row, column=col_idx, value=h)
                c.font = FONT_BOLD
                c.border = BORDER_THIN
                c.fill = GRAY_FILL
            current_row += 1

            for r in actividad.rrhh_items:
                ws.cell(row=current_row, column=2, value=r.codigo_costeo or "-")
                ws.cell(row=current_row, column=3, value=r.grupo_ocupacional)
                ws.cell(row=current_row, column=4, value=r.tiempo_minutos).alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=5, value=r.cantidad).alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=6, value=f"S/. {r.costo_unitario:.3f}").alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=7, value=f"S/. {r.costo_parcial:.3f}").alignment = Alignment(horizontal="right")
                for col_idx in range(2, 8):
                    ws.cell(row=current_row, column=col_idx).border = BORDER_THIN
                current_row += 1

        # Insumos
        if actividad.insumo_items:
            ws.merge_cells(f"B{current_row}:H{current_row}")
            ws.cell(row=current_row, column=2, value="Insumos y Materiales").font = FONT_BOLD
            ws.cell(row=current_row, column=2).fill = SUBHEADER_FILL
            current_row += 1

            headers_item = ["Código", "Descripción", "Tipo", "U. Medida", "Tiempo/Cant", "Costo Unitario", "Costo Parcial"]
            for col_idx, h in enumerate(headers_item, 2):
                c = ws.cell(row=current_row, column=col_idx, value=h)
                c.font = FONT_BOLD
                c.border = BORDER_THIN
                c.fill = GRAY_FILL
            current_row += 1

            for i in actividad.insumo_items:
                u_cons = i.unidad_consumo or i.unidad_medida or "UNIDAD"
                is_no_fung = i.tipo_insumo == "NO_FUNGIBLE" or (i.costo_minuto and i.costo_minuto > 0)
                ws.cell(row=current_row, column=2, value=i.codigo_usado or i.codigo_costeo or "-")
                ws.cell(row=current_row, column=3, value=i.descripcion)
                ws.cell(row=current_row, column=4, value=i.tipo_insumo)
                ws.cell(row=current_row, column=5, value=u_cons)
                ws.cell(row=current_row, column=6, value=f"{i.cantidad} ({i.tiempo_minutos} min)" if is_no_fung and i.tiempo_minutos > 0 else str(i.cantidad)).alignment = Alignment(horizontal="right")
                rate_str = f"S/. {i.costo_minuto:.3f} / min" if (i.costo_minuto and i.costo_minuto > 0) else f"S/. {i.costo_unitario:.3f}"
                ws.cell(row=current_row, column=7, value=rate_str).alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=8, value=f"S/. {i.costo_parcial:.3f}").alignment = Alignment(horizontal="right")
                for col_idx in range(2, 9):
                    ws.cell(row=current_row, column=col_idx).border = BORDER_THIN
                current_row += 1

        # Equipos
        if actividad.equipo_items:
            ws.merge_cells(f"B{current_row}:H{current_row}")
            ws.cell(row=current_row, column=2, value="Equipamiento y Mobiliario").font = FONT_BOLD
            ws.cell(row=current_row, column=2).fill = SUBHEADER_FILL
            current_row += 1

            headers_item = ["Código", "Descripción", "Tipo", "Tiempo (min)", "Cantidad", "Costo Minuto", "Costo Parcial"]
            for col_idx, h in enumerate(headers_item, 2):
                c = ws.cell(row=current_row, column=col_idx, value=h)
                c.font = FONT_BOLD
                c.border = BORDER_THIN
                c.fill = GRAY_FILL
            current_row += 1

            for e in actividad.equipo_items:
                ws.cell(row=current_row, column=2, value=e.codigo_costeo or "-")
                ws.cell(row=current_row, column=3, value=e.descripcion)
                ws.cell(row=current_row, column=4, value=e.tipo_equipamiento)
                ws.cell(row=current_row, column=5, value=e.tiempo_minutos).alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=6, value=e.cantidad).alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=7, value=f"S/. {e.costo_unitario:.3f}").alignment = Alignment(horizontal="right")
                ws.cell(row=current_row, column=8, value=f"S/. {e.costo_parcial:.3f}").alignment = Alignment(horizontal="right")
                for col_idx in range(2, 9):
                    ws.cell(row=current_row, column=col_idx).border = BORDER_THIN
                current_row += 1
        current_row += 1

    # Factores Directos e Indirectos de la UPSS
    ws.merge_cells(f"B{current_row}:H{current_row}")
    ws.cell(row=current_row, column=2, value="FACTORES DIRECTOS E INDIRECTOS DE LA UPSS").font = FONT_HEADER
    ws.cell(row=current_row, column=2).fill = HEADER_FILL
    current_row += 1

    headers_ups = ["Concepto / Factor", "Detalle / Asignación", "Tiempo (min)", "Costo Unitario", "Costo Parcial"]
    ws.merge_cells(f"B{current_row}:C{current_row}")
    ws.cell(row=current_row, column=2, value=headers_ups[0]).font = FONT_BOLD
    ws.cell(row=current_row, column=2).fill = GRAY_FILL
    ws.cell(row=current_row, column=3).border = BORDER_THIN
    ws.cell(row=current_row, column=2).border = BORDER_THIN

    ws.cell(row=current_row, column=4, value=headers_ups[1]).font = FONT_BOLD
    ws.cell(row=current_row, column=4).fill = GRAY_FILL
    ws.cell(row=current_row, column=4).border = BORDER_THIN

    ws.cell(row=current_row, column=5, value=headers_ups[2]).font = FONT_BOLD
    ws.cell(row=current_row, column=5).fill = GRAY_FILL
    ws.cell(row=current_row, column=5).alignment = Alignment(horizontal="right")
    ws.cell(row=current_row, column=5).border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    ws.cell(row=current_row, column=6, value=headers_ups[3]).font = FONT_BOLD
    ws.cell(row=current_row, column=6).fill = GRAY_FILL
    ws.cell(row=current_row, column=6).alignment = Alignment(horizontal="right")
    ws.cell(row=current_row, column=6).border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    ws.cell(row=current_row, column=8, value=headers_ups[4]).font = FONT_BOLD
    ws.cell(row=current_row, column=8).fill = GRAY_FILL
    ws.cell(row=current_row, column=8).alignment = Alignment(horizontal="right")
    ws.cell(row=current_row, column=8).border = BORDER_THIN
    current_row += 1

    # Fila 1: Infraestructura
    deprec_rate_str = f"S/. {(costeo.costo_infraestructura / costeo.tiempo_total_minutos):.6f} / min" if costeo.tiempo_total_minutos > 0 and costeo.costo_infraestructura > 0 else "S/. 0.000000 / min"
    ws.merge_cells(f"B{current_row}:C{current_row}")
    ws.cell(row=current_row, column=2, value="Costo de la Infraestructura").font = FONT_BOLD
    ws.cell(row=current_row, column=2).border = BORDER_THIN
    ws.cell(row=current_row, column=3).border = BORDER_THIN

    ws.cell(row=current_row, column=4, value=costeo.upss_servicio or "Ambiente UPSS").border = BORDER_THIN

    c_t = ws.cell(row=current_row, column=5, value=costeo.tiempo_total_minutos)
    c_t.alignment = Alignment(horizontal="right")
    c_t.border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    c_r = ws.cell(row=current_row, column=6, value=deprec_rate_str)
    c_r.alignment = Alignment(horizontal="right")
    c_r.border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    c_p = ws.cell(row=current_row, column=8, value=f"S/. {costeo.costo_infraestructura:.3f}")
    c_p.font = FONT_BOLD
    c_p.alignment = Alignment(horizontal="right")
    c_p.border = BORDER_THIN
    current_row += 1

    # Fila 2: Servicios Básicos
    ws.merge_cells(f"B{current_row}:C{current_row}")
    ws.cell(row=current_row, column=2, value="Costo de servicios basicos").font = FONT_BOLD
    ws.cell(row=current_row, column=2).border = BORDER_THIN
    ws.cell(row=current_row, column=3).border = BORDER_THIN

    ws.cell(row=current_row, column=4, value="Energía, Agua, Conectividad (PMS)").border = BORDER_THIN

    c_t2 = ws.cell(row=current_row, column=5, value="-")
    c_t2.alignment = Alignment(horizontal="center")
    c_t2.border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    c_r2 = ws.cell(row=current_row, column=6, value=f"S/. {costeo.costo_servicios:.4f}")
    c_r2.alignment = Alignment(horizontal="right")
    c_r2.border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    c_p2 = ws.cell(row=current_row, column=8, value=f"S/. {costeo.costo_servicios:.3f}")
    c_p2.font = FONT_BOLD
    c_p2.alignment = Alignment(horizontal="right")
    c_p2.border = BORDER_THIN
    current_row += 2

    # Factores Indirectos de la UPSS
    ws.merge_cells(f"B{current_row}:H{current_row}")
    ws.cell(row=current_row, column=2, value="FACTORES INDIRECTOS DE LA UPSS").font = FONT_HEADER
    ws.cell(row=current_row, column=2).fill = HEADER_FILL
    current_row += 1

    headers_ind = ["Concepto / Factor Indirecto", "Detalle / Asignación", "Costo Unitario", "Costo Parcial"]
    ws.merge_cells(f"B{current_row}:D{current_row}")
    ws.cell(row=current_row, column=2, value=headers_ind[0]).font = FONT_BOLD
    ws.cell(row=current_row, column=2).fill = GRAY_FILL
    ws.cell(row=current_row, column=2).border = BORDER_THIN
    ws.cell(row=current_row, column=3).border = BORDER_THIN
    ws.cell(row=current_row, column=4).border = BORDER_THIN

    ws.cell(row=current_row, column=5, value=headers_ind[1]).font = FONT_BOLD
    ws.cell(row=current_row, column=5).fill = GRAY_FILL
    ws.cell(row=current_row, column=5).border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    ws.cell(row=current_row, column=6, value=headers_ind[2]).font = FONT_BOLD
    ws.cell(row=current_row, column=6).fill = GRAY_FILL
    ws.cell(row=current_row, column=6).alignment = Alignment(horizontal="right")
    ws.cell(row=current_row, column=6).border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    ws.cell(row=current_row, column=8, value=headers_ind[3]).font = FONT_BOLD
    ws.cell(row=current_row, column=8).fill = GRAY_FILL
    ws.cell(row=current_row, column=8).alignment = Alignment(horizontal="right")
    ws.cell(row=current_row, column=8).border = BORDER_THIN
    current_row += 1

    # Fila 1: Servicios Administrativos
    ws.merge_cells(f"B{current_row}:D{current_row}")
    ws.cell(row=current_row, column=2, value="Costo asignado de servicios administrativos").font = FONT_BOLD
    ws.cell(row=current_row, column=2).border = BORDER_THIN
    ws.cell(row=current_row, column=3).border = BORDER_THIN
    ws.cell(row=current_row, column=4).border = BORDER_THIN

    ws.cell(row=current_row, column=5, value="Gastos de Gestión y Soporte (UPSS)").border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    c_radmin = ws.cell(row=current_row, column=6, value=f"S/. {costeo.gastos_admin:.4f}")
    c_radmin.alignment = Alignment(horizontal="right")
    c_radmin.border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    c_padmin = ws.cell(row=current_row, column=8, value=f"S/. {costeo.gastos_admin:.3f}")
    c_padmin.font = FONT_BOLD
    c_padmin.alignment = Alignment(horizontal="right")
    c_padmin.border = BORDER_THIN
    current_row += 1

    # Fila 2: Servicios Generales
    ws.merge_cells(f"B{current_row}:D{current_row}")
    ws.cell(row=current_row, column=2, value="Costo asignado a servicios generales").font = FONT_BOLD
    ws.cell(row=current_row, column=2).border = BORDER_THIN
    ws.cell(row=current_row, column=3).border = BORDER_THIN
    ws.cell(row=current_row, column=4).border = BORDER_THIN

    ws.cell(row=current_row, column=5, value="Mantenimiento, Limpieza, Seguridad").border = BORDER_THIN

    ws.merge_cells(f"F{current_row}:G{current_row}")
    c_rgral = ws.cell(row=current_row, column=6, value=f"S/. {costeo.gastos_generales:.4f}")
    c_rgral.alignment = Alignment(horizontal="right")
    c_rgral.border = BORDER_THIN
    ws.cell(row=current_row, column=7).border = BORDER_THIN

    c_pgral = ws.cell(row=current_row, column=8, value=f"S/. {costeo.gastos_generales:.3f}")
    c_pgral.font = FONT_BOLD
    c_pgral.alignment = Alignment(horizontal="right")
    c_pgral.border = BORDER_THIN
    current_row += 2

    # Factores de Producción Indirectos y Totales
    ws.merge_cells(f"B{current_row}:H{current_row}")
    ws.cell(row=current_row, column=2, value="RESUMEN GENERAL DE COSTOS ESTÁNDAR").font = FONT_HEADER
    ws.cell(row=current_row, column=2).fill = HEADER_FILL
    current_row += 1

    filas_resumen = [
        ("Costo RRHH", costeo.costo_rrhh),
        ("Costo Insumos y Materiales", costeo.costo_insumos),
        ("Costo Equipamiento y Mobiliario", costeo.costo_equipos),
        ("Costo Infraestructura (Depreciación)", costeo.costo_infraestructura),
        ("Costo Servicios Básicos", costeo.costo_servicios),
        ("TOTAL COSTO DIRECTO", costeo.costo_directo),
        ("Gastos Administrativos", costeo.gastos_admin),
        ("Gastos Generales", costeo.gastos_generales),
        ("TOTAL COSTO INDIRECTO", costeo.costo_indirecto),
        ("COSTO TOTAL ESTÁNDAR", costeo.costo_total_estandar),
    ]

    for label, val in filas_resumen:
        is_total = "TOTAL" in label or "COSTO TOTAL" in label
        ws.merge_cells(f"B{current_row}:F{current_row}")
        c_lbl = ws.cell(row=current_row, column=2, value=label)
        c_lbl.font = FONT_BOLD if is_total else FONT_REGULAR
        if is_total:
            c_lbl.fill = ACCENT_FILL

        ws.merge_cells(f"G{current_row}:H{current_row}")
        c_val = ws.cell(row=current_row, column=7, value=f"S/. {val:.3f}")
        c_val.font = FONT_BOLD if is_total else FONT_REGULAR
        c_val.alignment = Alignment(horizontal="right")
        if is_total:
            c_val.fill = ACCENT_FILL

        for c_i in range(2, 9):
            ws.cell(row=current_row, column=c_i).border = BORDER_THIN
        current_row += 1

    # Ajuste de ancho de columnas
    ws.column_dimensions['A'].width = 3
    ws.column_dimensions['B'].width = 18
    ws.column_dimensions['C'].width = 45
    ws.column_dimensions['D'].width = 20
    ws.column_dimensions['E'].width = 15
    ws.column_dimensions['F'].width = 15
    ws.column_dimensions['G'].width = 20
    ws.column_dimensions['H'].width = 20

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

def export_summary_matrix_excel(procedures: list) -> io.BytesIO:
    """Genera el Excel oficial MATRIZ RESUMEN con todos los procedimientos"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MATRIZ RESUMEN"
    ws.views.sheetView[0].showGridLines = True

    ws.merge_cells("B2:N2")
    ws["B2"] = "MATRIZ RESUMEN DE ESTRUCTURAS DE COSTOS ESTÁNDAR DE PROCEDIMIENTOS MÉDICOS Y SANITARIOS"
    ws["B2"].font = FONT_TITLE
    ws["B2"].alignment = Alignment(horizontal="center", vertical="center")

    headers = [
        "N°", "Código CPMS", "Descripción de Procedimiento", "UPSS / Servicio",
        "Costo RRHH", "Costo Equipos", "Costo Infraest.", "Costo Insumos", "Costo Servicios",
        "Costo Directo", "Gtos Admin", "Gtos Grales", "Costo Indirecto", "Costo Total Estándar"
    ]

    for col_idx, h in enumerate(headers, 1):
        c = ws.cell(row=4, column=col_idx, value=h)
        c.font = FONT_HEADER
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BORDER_THIN

    for idx, p in enumerate(procedures, 1):
        row_idx = 4 + idx
        ws.cell(row=row_idx, column=1, value=idx).alignment = Alignment(horizontal="center")
        ws.cell(row=row_idx, column=2, value=p.codigo_cpms).alignment = Alignment(horizontal="center")
        ws.cell(row=row_idx, column=3, value=p.nombre_procedimiento)
        ws.cell(row=row_idx, column=4, value=p.upss_servicio or "")
        ws.cell(row=row_idx, column=5, value=p.costo_rrhh)
        ws.cell(row=row_idx, column=6, value=p.costo_equipos)
        ws.cell(row=row_idx, column=7, value=p.costo_infraestructura)
        ws.cell(row=row_idx, column=8, value=p.costo_insumos)
        ws.cell(row=row_idx, column=9, value=p.costo_servicios)
        ws.cell(row=row_idx, column=10, value=p.costo_directo).font = FONT_BOLD
        ws.cell(row=row_idx, column=11, value=p.gastos_admin)
        ws.cell(row=row_idx, column=12, value=p.gastos_generales)
        ws.cell(row=row_idx, column=13, value=p.costo_indirecto).font = FONT_BOLD
        ws.cell(row=row_idx, column=14, value=p.costo_total_estandar).font = FONT_BOLD

        for c_i in range(1, 15):
            cell = ws.cell(row=row_idx, column=c_i)
            cell.border = BORDER_THIN
            if c_i >= 5:
                cell.number_format = 'S/ #,##0.000'

    ws.column_dimensions['A'].width = 5
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 45
    ws.column_dimensions['D'].width = 20
    for col_l in ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']:
        ws.column_dimensions[col_l].width = 14

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

def export_tariff_proposal_excel(procedures: list) -> io.BytesIO:
    """Genera el Excel oficial Propuesta Tarifaria"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Propuesta Tarifaria"
    ws.views.sheetView[0].showGridLines = True

    ws.merge_cells("B2:H2")
    ws["B2"] = "PROPUESTA TARIFARIA: LISTADO DE TARIFAS DE PROCEDIMIENTOS MÉDICOS Y SANITARIOS"
    ws["B2"].font = FONT_TITLE
    ws["B2"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("B4:B6")
    ws["B4"] = "N°"
    ws.merge_cells("C4:C6")
    ws["C4"] = "Código CPMS"
    ws.merge_cells("D4:D6")
    ws["D4"] = "Procedimiento"
    ws.merge_cells("E4:E6")
    ws["E4"] = "Tarifa Referencial (Tr)\nS/."
    
    ws.merge_cells("F4:H4")
    ws["F4"] = "Tarifas Específicas Propuestas (S/.)"

    ws.merge_cells("F5:F6")
    ws["F5"] = "Población no adscrita\n(Tpu)"

    ws.merge_cells("G5:H5")
    ws["G5"] = "Venta de Servicios - IAFAS y Otras Entidades"

    ws["G6"] = "ESSALUD / FFAA / Policía"
    ws["H6"] = "Privados (IAFAS)"

    for r in range(4, 7):
        for c in range(2, 9):
            cell = ws.cell(row=r, column=c)
            cell.font = FONT_HEADER
            cell.fill = HEADER_FILL
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = BORDER_THIN

    for idx, p in enumerate(procedures, 1):
        r_idx = 6 + idx
        ws.cell(row=r_idx, column=2, value=idx).alignment = Alignment(horizontal="center")
        ws.cell(row=r_idx, column=3, value=p.codigo_cpms).alignment = Alignment(horizontal="center")
        ws.cell(row=r_idx, column=4, value=p.nombre_procedimiento)
        ws.cell(row=r_idx, column=5, value=p.tarifa_referencial or p.costo_total_estandar).alignment = Alignment(horizontal="right")
        ws.cell(row=r_idx, column=6, value=p.tarifa_no_asegurados).alignment = Alignment(horizontal="right")
        ws.cell(row=r_idx, column=7, value=p.tarifa_essalud).alignment = Alignment(horizontal="right")
        ws.cell(row=r_idx, column=8, value=p.tarifa_privados).alignment = Alignment(horizontal="right")

        for c in range(2, 9):
            cell = ws.cell(row=r_idx, column=c)
            cell.border = BORDER_THIN
            if c >= 5:
                cell.number_format = 'S/ #,##0.000'

    ws.column_dimensions['A'].width = 3
    ws.column_dimensions['B'].width = 6
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 50
    ws.column_dimensions['E'].width = 18
    ws.column_dimensions['F'].width = 18
    ws.column_dimensions['G'].width = 22
    ws.column_dimensions['H'].width = 18

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

