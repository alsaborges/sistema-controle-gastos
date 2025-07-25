import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, session
from flask_cors import CORS
from src.models.user import db, User
from src.routes.user import user_bp
from src.routes.investment import gasto_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'sua_chave_secreta_muito_segura_aqui_123456789'

# Habilitar CORS
CORS(app, supports_credentials=True)

app.register_blueprint(user_bp, url_prefix='/api/auth')
app.register_blueprint(gasto_bp, url_prefix='/api')

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar banco de dados
db.init_app(app)

def create_initial_user():
    """Cria o usuário inicial se não existir"""
    with app.app_context():
        # Criar tabelas se não existirem
        db.create_all()
        
        # Verificar se já existe o usuário inicial
        if not User.query.filter_by(username='alisson.borges').first():
            user = User(username='alisson.borges')
            user.set_password('123')
            db.session.add(user)
            db.session.commit()
            print("Usuário inicial criado: alisson.borges / 123")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    create_initial_user()
    app.run(host='0.0.0.0', port=5000, debug=True)

