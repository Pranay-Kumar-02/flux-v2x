# Third-Party Software Notices and Licenses

FluxV2X incorporates third-party open-source libraries and packages. This document lists the components, their licenses, and the applicable copyright notices in compliance with their redistribution requirements.

---

## 1. Backend Dependencies (Python)

| Component | Version | License | Primary Purpose | Repository / Source |
| :--- | :--- | :--- | :--- | :--- |
| **FastAPI** | `^0.115.0` | MIT | High-performance REST API routing | [tiangolo/fastapi](https://github.com/tiangolo/fastapi) |
| **Starlette** | `^0.41.0` | BSD-3-Clause | ASGI framework foundation | [encode/starlette](https://github.com/encode/starlette) |
| **Pydantic** | `^2.9.0` | MIT | Data parsing and validation | [pydantic/pydantic](https://github.com/pydantic/pydantic) |
| **Pydantic-Settings** | `^2.5.0` | MIT | Environment configuration management | [pydantic/pydantic-settings](https://github.com/pydantic/pydantic-settings) |
| **SQLAlchemy** | `^2.0.35` | MIT | Relational object-relational mapping | [sqlalchemy/sqlalchemy](https://github.com/sqlalchemy/sqlalchemy) |
| **Polars** | `^1.12.0` | MIT | High-performance columnar dataframe engine | [pola-rs/polars](https://github.com/pola-rs/polars) |
| **PyArrow** | `^18.0.0` | Apache-2.0 | Apache Parquet columnar storage IO | [apache/arrow](https://github.com/apache/arrow) |
| **Scikit-Learn** | `^1.5.2` | BSD-3-Clause | Machine learning models & clustering | [scikit-learn/scikit-learn](https://github.com/scikit-learn/scikit-learn) |
| **NumPy** | `^2.1.0` | BSD-3-Clause | Vectorized mathematics and matrices | [numpy/numpy](https://github.com/numpy/numpy) |
| **SciPy** | `^1.14.0` | BSD-3-Clause | Statistical distribution testing | [scipy/scipy](https://github.com/scipy/scipy) |
| **PyJWT** | `^2.9.0` | MIT | Standards-compliant JSON Web Tokens | [jpadilla/pyjwt](https://github.com/jpadilla/pyjwt) |
| **Uvicorn** | `^0.31.0` | BSD-3-Clause | Lightning-fast ASGI web server | [encode/uvicorn](https://github.com/encode/uvicorn) |
| **Python-Multipart** | `^0.0.12` | Apache-2.0 | Streaming multi-part form data uploads | [Kludex/python-multipart](https://github.com/Kludex/python-multipart) |
| **Psycopg2-binary** | `^2.9.9` | LGPL with exception | PostgreSQL relational database adapter | [psycopg/psycopg2](https://github.com/psycopg/psycopg2) |
| **Requests** | `^2.32.0` | Apache-2.0 | HTTP client for external dataset retrieval | [psf/requests](https://github.com/psf/requests) |

---

## 2. Frontend Dependencies (TypeScript / React)

| Component | Version | License | Primary Purpose | Repository / Source |
| :--- | :--- | :--- | :--- | :--- |
| **React** | `^18.3.1` | MIT | Declarative UI component tree | [facebook/react](https://github.com/facebook/react) |
| **React-DOM** | `^18.3.1` | MIT | DOM rendering engine for React | [facebook/react](https://github.com/facebook/react) |
| **Vite** | `^5.4.2` | MIT | Frontend build tool and dev server | [vitejs/vite](https://github.com/vitejs/vite) |
| **TailwindCSS** | `^3.4.11` | MIT | Utility-first CSS layout engine | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) |
| **Lucide-React** | `^0.441.0` | ISC | Accessible interface iconography | [lucide-icons/lucide](https://github.com/lucide-icons/lucide) |
| **TypeScript** | `^5.5.3` | Apache-2.0 | Static type system for JavaScript | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| **Autoprefixer** | `^10.4.20` | MIT | CSS vendor prefix automation | [postcss/autoprefixer](https://github.com/postcss/autoprefixer) |
| **PostCSS** | `^8.4.47` | MIT | CSS transformation toolchain | [postcss/postcss](https://github.com/postcss/postcss) |

---

## 3. License Texts & Attributions

### MIT License
```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### BSD 3-Clause License
```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Apache License 2.0
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

### ISC License
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.

---

## 4. Software Bill of Materials (SBOM) Generation
FluxV2X supports automated generation of standardized SPDX and CycloneDX bills of materials:
```bash
# Python backend SBOM generation via cyclonedx-bom
cd backend && uv run cyclonedx-bom -o sbom-backend.json

# Frontend SBOM generation via npm
cd frontend && npx @cyclonedx/cyclonedx-npm --output-file sbom-frontend.json
```
