import re
from collections import Counter
from pathlib import Path
from typing import Any

import frontmatter
import markdown2
from bs4 import BeautifulSoup
from langchain_text_splitters import MarkdownHeaderTextSplitter

DOCS_DIR = Path(__file__).parent.parent.parent.parent / "logfire" / "docs"
if not DOCS_DIR.exists():
    raise ValueError("This repo should live next to the logfire repo")

ignored_files = "release-notes.md", "help.md", "/api/", "/legal/"
docs_files = [
    file
    for file in DOCS_DIR.rglob("*.md")
    if not any(ignored in str(file) for ignored in ignored_files)
]


def get_markdown(path: Path) -> str:
    markdown_string = path.read_text()
    markdown_string = frontmatter.loads(markdown_string).content
    return markdown_string


def get_toc():
    result = ""
    for file in docs_files:
        markdown_string = get_markdown(file)
        markdown_string = re.sub(
            r"^```\w+ [^\n]+$", "```", markdown_string, flags=re.MULTILINE
        )
        html_output = markdown2.markdown(markdown_string, extras=["fenced-code-blocks"])  # type: ignore
        soup = BeautifulSoup(html_output, "html.parser")
        headers = soup.find_all(["h1", "h2", "h3", "h4"])
        result += f"{file.relative_to(DOCS_DIR)}\n"
        result += "\n".join(
            "#" * int(header.name[1]) + " " + header.get_text() for header in headers
        )  # type: ignore
        result += "\n\n"
    return result


headers_to_split_on = [("#" * n, f"H{n}") for n in range(1, 7)]


def get_docs_rows():
    data: list[dict[str, Any]] = []
    for file in docs_files:
        markdown_document = get_markdown(file)
        rel_path = str(file.relative_to(DOCS_DIR))

        unique: set[tuple[tuple[str, ...], str]] = set()
        for num_headers in range(len(headers_to_split_on)):
            splitter = MarkdownHeaderTextSplitter(headers_to_split_on[:num_headers])
            splits = splitter.split_text(markdown_document)
            for split in splits:
                metadata: dict[str, Any] = split.metadata  # type: ignore
                headers = [
                    f"{prefix} {metadata[header_type]}"
                    for prefix, header_type in headers_to_split_on
                    if header_type in metadata
                ]
                content = "\n\n".join([rel_path, *headers, split.page_content])
                if len(content.encode()) > 16384:
                    continue
                unique.add((tuple(headers), content))

        counts = Counter[tuple[str, ...]]()
        for headers, content in sorted(unique):
            counts[headers] += 1
            count = str(counts[headers])
            data.append(
                dict(
                    path=rel_path,
                    headers=headers,
                    text=content,
                    count=count,
                )
            )

    return data


if __name__ == "__main__":
    print(get_toc())
    rows = get_docs_rows()
    print(f"Generated {len(rows)} rows")
