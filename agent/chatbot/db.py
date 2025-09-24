import lancedb
from lancedb.embeddings import get_registry
from lancedb.pydantic import LanceModel, Vector  # type: ignore

from chatbot.data import get_docs_rows

db = lancedb.connect('/tmp/lancedb')

table_name = 'docs'


def create_table():
    embeddings = get_registry().get('sentence-transformers').create()  # type: ignore

    class Documents(LanceModel):
        path: str
        headers: list[str]
        count: int
        text: str = embeddings.SourceField()  # type: ignore
        vector: Vector(embeddings.ndims()) = embeddings.VectorField()  # type: ignore

    table = db.create_table(table_name, schema=Documents, mode='overwrite')  # type: ignore
    table.create_fts_index('text')
    return table


def open_table():
    try:
        return db.open_table(table_name)
    except ValueError:
        return create_table()


def populate_table():
    table = open_table()
    table.add(data=get_docs_rows())  # type: ignore


def open_populated_table():
    table = open_table()
    if table.count_rows() == 0:
        populate_table()
    return table
