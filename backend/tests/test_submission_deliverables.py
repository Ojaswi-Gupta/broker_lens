import os
import zipfile
from pathlib import Path


def get_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    while current.name != "broker_lens" and current.parent != current:
        current = current.parent
    return current


def test_tdd_pdf_exists_and_valid_size():
    root = get_repo_root()
    root_pdf = root / "Technical_Design_Document.pdf"
    docs_pdf = root / "docs" / "Technical_Design_Document.pdf"

    assert root_pdf.exists(), f"Missing root PDF deliverable: {root_pdf}"
    assert docs_pdf.exists(), f"Missing docs PDF deliverable: {docs_pdf}"

    size = root_pdf.stat().st_size
    assert size > 5000, f"PDF too small ({size} bytes)"
    assert size < 2 * 1024 * 1024, f"PDF exceeds 2 MB limit ({size} bytes)"

    with open(root_pdf, "rb") as f:
        header = f.read(5)
        assert header == b"%PDF-", f"Invalid PDF header: {header}"


def test_tdd_markdown_exists_and_contains_assumptions():
    root = get_repo_root()
    tdd_md = root / "docs" / "TDD.md"

    assert tdd_md.exists(), f"Missing TDD markdown at {tdd_md}"
    content = tdd_md.read_text(encoding="utf-8")

    # Verify repository link and header
    assert "https://github.com/Ojaswi-Gupta/broker_lens.git" in content
    assert "Company A" in content
    assert "Navi Mumbai" in content
    assert "Problem Statement #3" in content

    # Verify all 6 assumptions
    for i in range(1, 7):
        assumption_tag = f"ASSUMPTION-0{i}"
        assert assumption_tag in content, f"Missing assumption tag: {assumption_tag}"

    # Verify financial math alignment
    assert "34.65" in content  # ₹34.65 Lakh labor bleed
    assert "35.64" in content  # ₹35.64 Lakh demurrage bleed
    assert "70.29" in content  # ₹70.29 Lakh total problem cost
    assert "52.40" in content  # ₹52.40 Lakh net savings


def test_deployment_md_exists_and_contains_quickstart():
    root = get_repo_root()
    deploy_md = root / "deployment.md"

    assert deploy_md.exists(), f"Missing deployment.md at {deploy_md}"
    content = deploy_md.read_text(encoding="utf-8")

    assert "https://github.com/Ojaswi-Gupta/broker_lens.git" in content
    assert "docker-compose up -d --build" in content
    assert "exec@companya-cha.in" in content
    assert "manager@companya-cha.in" in content

    # Verify security: No actual Google API secret values documented
    assert "AIzaSy" not in content, "Real Google API key detected in deployment.md!"


def test_submission_zip_packages_exist_and_valid():
    root = get_repo_root()
    zips = [
        root / "BrokerLens_Submission_Ojaswi_Gupta.zip",
        root / "submission_package.zip",
    ]

    for zpath in zips:
        assert zpath.exists(), f"Missing zip archive: {zpath}"
        size = zpath.stat().st_size
        assert size < 25 * 1024 * 1024, f"Zip archive exceeds 25 MB: {size} bytes"

        with zipfile.ZipFile(zpath, "r") as zf:
            namelist = zf.namelist()
            assert len(namelist) == 2, f"Zip must contain exactly 2 files, got {namelist}"
            assert "Technical_Design_Document.pdf" in namelist
            assert "deployment.md" in namelist
            for name in namelist:
                assert "/" not in name, f"Zip entries must be flat at root, found: {name}"
