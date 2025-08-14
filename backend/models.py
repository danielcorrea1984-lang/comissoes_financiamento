from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='vendedor')  # 'vendedor' ou 'admin'
    loja_parceira = db.Column(db.String(200))

class CommissionRule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # null = regra global
    min_value = db.Column(db.Float, nullable=False)
    max_value = db.Column(db.Float, nullable=True)  # null = sem teto
    percent = db.Column(db.Float, nullable=False)

class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    target_value = db.Column(db.Float, nullable=False)
    bonus_type = db.Column(db.String(20), nullable=True)  # 'fixed' ou 'percent'
    bonus_amount = db.Column(db.Float, nullable=True)

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    client_name = db.Column(db.String(200), nullable=False)
    client_document = db.Column(db.String(30), nullable=False)  # CPF ou CNPJ
    value = db.Column(db.Float, nullable=False)
    bank = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(30), nullable=False)  # enviada, aceita, recusada
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    commission = db.Column(db.Float, nullable=True)
    awarded_bonus = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)