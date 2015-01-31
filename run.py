"""
-------------------------------------------------------
runserver
starts the flask server
-------------------------------------------------------
Author:  Dallas Fraser
ID:      110242560
Email:   fras2560@mylaurier.ca
Version: 2015-01-31
-------------------------------------------------------
"""
#!flask/bin/python
from server import app
if __name__ == "__main__":
    app.run(debug = True)