import datetime
import io
import os

import openpyxl
from openpyxl.cell.cell import MergedCell

AQUI = os.path.dirname(os.path.abspath(__file__))
TURNOS = ('1º', '2º', '3º')
KG_PACOTE = 7.5  # cada pacote de reprocesso tem 7,5 kg
DESC = {'MR0036': 'MASSA REPROCESSO PÃO FRANCÊS', 'MR0001': 'MASSA REPROCESSO SALGADA - PRODUCAO', 'MR0027': 'MASSA REPROCESSO SALGADA - PRODUCAO'}


def _n(v):
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        return float(str(v).replace('%', '').replace(',', '.').strip())
    except ValueError:
        return None


def _pct(v):
    n = _n(v)
    return None if n is None else n / 100


def _set(ws, ref, valor):
    try:
        ws[ref].value = valor
        if isinstance(valor, datetime.datetime):
            ws[ref].number_format = 'dd/mm/yyyy'
    except AttributeError:  # célula dentro de uma mesclagem
        pass


def gerar_report_geral(d):
    """Preenche o modelo REPORT_EMAIL.xlsx com o report do dia anterior (6 linhas por bloco)."""
    wb = openpyxl.load_workbook(os.path.join(AQUI, '_modelo_report.xlsx'))
    ws = wb['Report']
    m = d.get('m', {})
    data = datetime.datetime.strptime(str(d.get('data'))[:10], '%Y-%m-%d')

    # limpa os dados de exemplo (as fórmulas de descrição ficam)
    for r in range(6, 12):
        for c in 'BCDIJLMN': _set(ws, f'{c}{r}', None)
        _set(ws, f'K{r}', f'=IFERROR(J{r}/I{r},"")')
    for r in (14, 15, 16):
        for c in 'IJ': _set(ws, f'{c}{r}', None)
    for r in range(19, 25):
        for c in 'BCDIJK': _set(ws, f'{c}{r}', None)
    for r in range(30, 36):
        for c in 'BCFIKM': _set(ws, f'{c}{r}', None)
    for r in range(38, 42):
        for c in 'BCDEIJK': _set(ws, f'{c}{r}', None)
    for r in range(44, 50):
        for c in 'BCDEIOPQ': _set(ws, f'{c}{r}', None)

    for i, p in enumerate((m.get('prod') or [])[:6]):
        r = 6 + i
        _set(ws, f'B{r}', p.get('codigo')); _set(ws, f'C{r}', data); _set(ws, f'D{r}', p.get('turno'))
        _set(ws, f'I{r}', _n(p.get('prog'))); _set(ws, f'J{r}', _n(p.get('prod'))); _set(ws, f'L{r}', _n(p.get('pacotes')))
        _set(ws, f'M{r}', p.get('op') or None); _set(ws, f'N{r}', p.get('ocorr') or None)

    for g in m.get('gelo') or []:
        if g.get('turno') in TURNOS:
            r = 14 + TURNOS.index(g['turno'])
            _set(ws, f'I{r}', _n(g.get('pesados'))); _set(ws, f'J{r}', _n(g.get('estoque')))

    for i, a in enumerate((m.get('abs') or [])[:6]):
        r = 19 + i
        _set(ws, f'B{r}', a.get('codigo')); _set(ws, f'C{r}', data); _set(ws, f'D{r}', a.get('turno'))
        _set(ws, f'I{r}', _n(a.get('lotes'))); _set(ws, f'J{r}', _pct(a.get('pct'))); _set(ws, f'K{r}', a.get('farinha') or None)

    cols = {'1º': ('B', 'C'), '2º': ('F', 'I'), '3º': ('K', 'M')}
    cont = {t: 0 for t in TURNOS}
    for f in m.get('falt') or []:
        t = f.get('turno')
        if t in cols and cont[t] < 6:
            r = 30 + cont[t]; cont[t] += 1
            _set(ws, f'{cols[t][0]}{r}', f.get('nome')); _set(ws, f'{cols[t][1]}{r}', f.get('motivo'))

    for i, g in enumerate((m.get('gerado') or [])[:4]):
        r = 38 + i
        _set(ws, f'B{r}', 'MR0036'); _set(ws, f'C{r}', data); _set(ws, f'D{r}', g.get('turno')); _set(ws, f'E{r}', DESC['MR0036'])
        kg = _n(g.get('kg')) or 0
        _set(ws, f'I{r}', round(kg / KG_PACOTE, 1)); ws[f'I{r}'].number_format = 'General'
        _set(ws, f'J{r}', kg); _set(ws, f'K{r}', g.get('motivo') or None)

    for i, c in enumerate((m.get('cons') or [])[:6]):
        r = 44 + i
        _set(ws, f'B{r}', c.get('codigo')); _set(ws, f'C{r}', data); _set(ws, f'D{r}', c.get('turno'))
        _set(ws, f'E{r}', DESC.get(c.get('codigo'), '')); _set(ws, f'I{r}', _n(c.get('kg')))

    out = io.BytesIO(); wb.save(out)
    return out.getvalue()
