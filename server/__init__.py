"""
-------------------------------------------------------
dfa
a flask app using d3 and networkx to help visualize dfas
-------------------------------------------------------
Author:  Dallas Fraser
ID:      110242560
Email:   fras2560@mylaurier.ca
Version: 2015-01-31
-------------------------------------------------------
"""
from flask import Flask, g , request
import logging
# create the application
app = Flask(__name__)
app.config.from_object("config")
#load default config
app.config.update(dict(
                       DEBUG=True,
                       SECRET_KEY="development key",
                       USERNAME="admin",
                       PASSWORD="default"))
app.config.from_envvar('FLASKR_SETTINGS', silent=True)
app.config['UPLOAD_FOLDER'] = 'uploads'
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)

from server import views

if __name__ == '__main__':
    app.run()