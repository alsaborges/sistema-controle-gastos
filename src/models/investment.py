from src.models.user import db
from datetime import datetime

class Gasto(db.Model):
    __tablename__ = 'gastos'
    
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Date, nullable=False, default=datetime.utcnow().date())
    para_quem = db.Column(db.String(100), nullable=False)
    do_que = db.Column(db.String(100), nullable=False)
    com_o_que = db.Column(db.String(100), nullable=False)
    obs = db.Column(db.String(200))
    cred_deb = db.Column(db.String(20), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'data': self.data.isoformat() if self.data else None,
            'para_quem': self.para_quem,
            'do_que': self.do_que,
            'com_o_que': self.com_o_que,
            'obs': self.obs,
            'cred_deb': self.cred_deb,
            'valor': self.valor,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }