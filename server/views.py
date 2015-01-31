"""
-------------------------------------------------------
views
holds all the views
-------------------------------------------------------
Author:  Dallas Fraser
ID:      110242560
Email:   fras2560@mylaurier.ca
Version: 2015-01-31
-------------------------------------------------------
"""
from flask import render_template, json, request, make_response
from server import app, logger

@app.route("/")
def index():
    return render_template('dfa.html')

