from flask import Blueprint, request, jsonify, session
from src.models.investment import Gasto
from src.models.user import db
from datetime import datetime, date
from sqlalchemy import func, extract

gasto_bp = Blueprint('gasto', __name__)

def require_auth():
    """Decorator para verificar autenticação"""
    if 'user_id' not in session:
        return jsonify({'error': 'Acesso negado'}), 401
    return None

@gasto_bp.route('/gastos', methods=['GET'])
def get_gastos():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    gastos = Gasto.query.order_by(Gasto.data.desc()).all()
    return jsonify([gasto.to_dict() for gasto in gastos])

@gasto_bp.route('/gastos', methods=['POST'])
def create_gasto():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    data = request.get_json()
    
    # Converter string de data para objeto date
    data_obj = datetime.strptime(data['data'], '%Y-%m-%d').date()
    
    gasto = Gasto(
        data=data_obj,
        para_quem=data['para_quem'],
        do_que=data['do_que'],
        com_o_que=data['com_o_que'],
        obs=data.get('obs', ''),
        cred_deb=data['cred_deb'],
        valor=data['valor']
    )
    
    try:
        db.session.add(gasto)
        db.session.commit()
        return jsonify(gasto.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@gasto_bp.route('/gastos/<int:gasto_id>', methods=['PUT'])
def update_gasto(gasto_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    gasto = Gasto.query.get_or_404(gasto_id)
    data = request.get_json()
    
    # Converter string de data para objeto date
    data_obj = datetime.strptime(data['data'], '%Y-%m-%d').date()
    
    gasto.data = data_obj
    gasto.para_quem = data['para_quem']
    gasto.do_que = data['do_que']
    gasto.com_o_que = data['com_o_que']
    gasto.obs = data.get('obs', '')
    gasto.cred_deb = data['cred_deb']
    gasto.valor = data['valor']
    
    try:
        db.session.commit()
        return jsonify(gasto.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@gasto_bp.route('/gastos/<int:gasto_id>', methods=['DELETE'])
def delete_gasto(gasto_id):
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    gasto = Gasto.query.get_or_404(gasto_id)
    
    try:
        db.session.delete(gasto)
        db.session.commit()
        return jsonify({'message': 'Gasto excluído com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@gasto_bp.route('/gastos/summary', methods=['GET'])
def get_summary():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    gastos = Gasto.query.all()
    
    total = 0
    por_pessoa = {}
    
    for gasto in gastos:
        valor = gasto.valor if gasto.cred_deb == 'Crédito' else -gasto.valor
        total += valor
        
        if gasto.para_quem not in por_pessoa:
            por_pessoa[gasto.para_quem] = 0
        por_pessoa[gasto.para_quem] += valor
    
    return jsonify({
        'total': total,
        'total_registros': len(gastos),
        'por_pessoa': por_pessoa
    })

@gasto_bp.route('/gastos/pessoas', methods=['GET'])
def get_pessoas():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    pessoas = db.session.query(Gasto.para_quem).distinct().all()
    return jsonify([pessoa[0] for pessoa in pessoas])

@gasto_bp.route('/gastos/categorias', methods=['GET'])
def get_categorias():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    categorias = db.session.query(Gasto.do_que).distinct().all()
    return jsonify([categoria[0] for categoria in categorias])

@gasto_bp.route('/gastos/filter', methods=['GET'])
def filter_gastos():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    query = Gasto.query
    
    # Filtro por data de início
    data_inicio = request.args.get('data_inicio')
    if data_inicio:
        data_inicio_obj = datetime.strptime(data_inicio, '%Y-%m-%d').date()
        query = query.filter(Gasto.data >= data_inicio_obj)
    
    # Filtro por data de fim
    data_fim = request.args.get('data_fim')
    if data_fim:
        data_fim_obj = datetime.strptime(data_fim, '%Y-%m-%d').date()
        query = query.filter(Gasto.data <= data_fim_obj)
    
    # Filtro por pessoa
    pessoa = request.args.get('pessoa')
    if pessoa:
        query = query.filter(Gasto.para_quem == pessoa)
    
    # Filtro por tipo
    tipo = request.args.get('tipo')
    if tipo:
        query = query.filter(Gasto.cred_deb == tipo)
    
    gastos = query.order_by(Gasto.data.desc()).all()
    return jsonify([gasto.to_dict() for gasto in gastos])

@gasto_bp.route('/gastos/analytics', methods=['GET'])
def get_analytics():
    auth_error = require_auth()
    if auth_error:
        return auth_error
    
    # Filtros opcionais
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    
    query = Gasto.query
    
    if data_inicio:
        data_inicio_obj = datetime.strptime(data_inicio, '%Y-%m-%d').date()
        query = query.filter(Gasto.data >= data_inicio_obj)
    
    if data_fim:
        data_fim_obj = datetime.strptime(data_fim, '%Y-%m-%d').date()
        query = query.filter(Gasto.data <= data_fim_obj)
    
    gastos = query.all()
    
    # Resumo geral
    entradas = sum(g.valor for g in gastos if g.cred_deb == 'Crédito')
    saidas = sum(g.valor for g in gastos if g.cred_deb == 'Débito')
    
    # Por pessoa
    por_pessoa = {}
    for gasto in gastos:
        if gasto.para_quem not in por_pessoa:
            por_pessoa[gasto.para_quem] = {'entradas': 0, 'saidas': 0, 'total': 0}
        
        if gasto.cred_deb == 'Crédito':
            por_pessoa[gasto.para_quem]['entradas'] += gasto.valor
            por_pessoa[gasto.para_quem]['total'] += gasto.valor
        else:
            por_pessoa[gasto.para_quem]['saidas'] += gasto.valor
            por_pessoa[gasto.para_quem]['total'] -= gasto.valor
    
    # Por categoria
    por_categoria = {}
    for gasto in gastos:
        if gasto.do_que not in por_categoria:
            por_categoria[gasto.do_que] = {'entradas': 0, 'saidas': 0, 'total': 0}
        
        if gasto.cred_deb == 'Crédito':
            por_categoria[gasto.do_que]['entradas'] += gasto.valor
            por_categoria[gasto.do_que]['total'] += gasto.valor
        else:
            por_categoria[gasto.do_que]['saidas'] += gasto.valor
            por_categoria[gasto.do_que]['total'] -= gasto.valor
    
    # Por mês
    por_mes = {}
    for gasto in gastos:
        mes_key = f"{gasto.data.year}-{gasto.data.month:02d}"
        if mes_key not in por_mes:
            por_mes[mes_key] = {'entradas': 0, 'saidas': 0, 'saldo': 0}
        
        if gasto.cred_deb == 'Crédito':
            por_mes[mes_key]['entradas'] += gasto.valor
            por_mes[mes_key]['saldo'] += gasto.valor
        else:
            por_mes[mes_key]['saidas'] += gasto.valor
            por_mes[mes_key]['saldo'] -= gasto.valor
    
    # Converter para lista ordenada
    por_mes_lista = []
    for mes, dados in sorted(por_mes.items()):
        por_mes_lista.append({
            'mes': mes,
            'entradas': dados['entradas'],
            'saidas': dados['saidas'],
            'saldo': dados['saldo']
        })
    
    return jsonify({
        'resumo_geral': {
            'entradas': entradas,
            'saidas': saidas,
            'saldo': entradas - saidas
        },
        'por_pessoa': por_pessoa,
        'por_categoria': por_categoria,
        'por_mes': por_mes_lista
    })

