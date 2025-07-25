from flask import Blueprint, request, jsonify, session
from src.models.user import User
from src.database import db

user_bp = Blueprint('user', __name__)

@user_bp.route('/login', methods=['POST'])
def login():
    """Rota para login do usuário"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username e password são obrigatórios'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']) and user.is_active:
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': user.to_dict()
        }), 200
    else:
        return jsonify({'error': 'Credenciais inválidas'}), 401

@user_bp.route('/logout', methods=['POST'])
def logout():
    """Rota para logout do usuário"""
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'}), 200

@user_bp.route('/register', methods=['POST'])
def register():
    """Rota para cadastro de novo usuário"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username e password são obrigatórios'}), 400
    
    # Verificar se usuário já existe
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Usuário já existe'}), 409
    
    # Criar novo usuário
    user = User(username=data['username'])
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Erro ao criar usuário'}), 500

@user_bp.route('/check-session', methods=['GET'])
def check_session():
    """Verifica se o usuário está logado"""
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user and user.is_active:
            return jsonify({
                'logged_in': True,
                'user': user.to_dict()
            }), 200
    
    return jsonify({'logged_in': False}), 200

@user_bp.route('/users', methods=['GET'])
def list_users():
    """Lista todos os usuários (apenas para usuários logados)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Acesso negado'}), 401
    
    users = User.query.filter_by(is_active=True).all()
    return jsonify([user.to_dict() for user in users]), 200

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Atualiza dados do usuário"""
    if 'user_id' not in session:
        return jsonify({'error': 'Acesso negado'}), 401
    
    # Só pode atualizar próprio usuário ou se for admin (implementar depois)
    if session['user_id'] != user_id:
        return jsonify({'error': 'Acesso negado'}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if data.get('password'):
        user.set_password(data['password'])
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Erro ao atualizar usuário'}), 500

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Desativa usuário (soft delete)"""
    if 'user_id' not in session:
        return jsonify({'error': 'Acesso negado'}), 401
    
    # Não pode deletar próprio usuário
    if session['user_id'] == user_id:
        return jsonify({'error': 'Não é possível deletar próprio usuário'}), 400
    
    user = User.query.get_or_404(user_id)
    user.is_active = False
    
    try:
        db.session.commit()
        return jsonify({'message': 'Usuário desativado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Erro ao desativar usuário'}), 500

