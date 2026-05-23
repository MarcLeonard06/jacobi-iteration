"""
Jacobi Iteration Solver — Flask backend.
Exposes /calculate endpoint for solving Ax = b iteratively.
"""

from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

MIN_MATRIX_SIZE = 2
MAX_MATRIX_SIZE = 8
MIN_TOLERANCE   = 1e-15
MAX_TOLERANCE   = 1e-1
MIN_ITERATIONS  = 1
MAX_ITERATIONS  = 500


def jacobi_iteration(A, b, x0=None, tol=1e-6, max_iter=100):
    """
    Solve Ax = b using Jacobi iteration.
    Returns list of iteration steps for display.
    """
    n = len(b)

    # Validate diagonal dominance (warn only)
    warnings = []
    for i in range(n):
        diag = abs(A[i][i])
        off_diag_sum = sum(abs(A[i][j]) for j in range(n) if j != i)
        if diag <= off_diag_sum:
            warnings.append(f"Row {i+1}: not strictly diagonally dominant (may not converge)")

    # Initial guess
    if x0 is None:
        x = [0.0] * n
    else:
        x = list(x0)

    steps = []
    steps.append({
        "iteration": 0,
        "x": [round(v, 8) for v in x],
        "residual": None
    })

    

    for k in range(1, max_iter + 1):
        x_new = [0.0] * n
        for i in range(n):
            if A[i][i] == 0:
                raise ValueError(f"Zero diagonal element at row {i+1}. Reorder the system.")
            s = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x_new[i] = (b[i] - s) / A[i][i]

        # Compute residual (max absolute change)
        residual = max(abs(x_new[i] - x[i]) for i in range(n))

        steps.append({
            "iteration": k,
            "x": [round(v, 8) for v in x_new],
            "residual": round(residual, 10)
        })

        if residual < tol:
            return {
                "converged": True,
                "iterations": k,
                "solution": [round(v, 8) for v in x_new],
                "steps": steps,
                "warnings": warnings
            }

        x = x_new

    return {
        "converged": False,
        "iterations": max_iter,
        "solution": [round(v, 8) for v in x],
        "steps": steps,
        "warnings": warnings

        
    }


def safe_parse_matrix(raw, n):
    """Parse a flat list of floats into an n×n matrix."""
    if len(raw) != n * n:
        raise ValueError(f"Expected {n*n} values for {n}×{n} matrix, got {len(raw)}.")
    matrix = []
    for i in range(n):
        row = [float(raw[i * n + j]) for j in range(n)]
        matrix.append(row)
    return matrix


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/calculate", methods=["POST"])
def calculate():
    try:
        data = request.get_json()

        n = int(data.get("n", 3))
        if not (MIN_MATRIX_SIZE <= n <= MAX_MATRIX_SIZE):
            return jsonify({"error": f"Matrix size must be between {MIN_MATRIX_SIZE} and {MAX_MATRIX_SIZE}."}), 400

        raw_A = data.get("A", [])
        raw_b = data.get("b", [])
        raw_x0 = data.get("x0", None)
        tol = float(data.get("tol", 1e-6))
        max_iter = int(data.get("max_iter", 100))

        if not (MIN_TOLERANCE <= tol <= MAX_TOLERANCE):
            return jsonify({"error": f"Tolerance must be between {MIN_TOLERANCE} and {MAX_TOLERANCE}."}), 400
        if not (MIN_ITERATIONS <= max_iter <= MAX_ITERATIONS):
            return jsonify({"error": f"Max iterations must be between {MIN_ITERATIONS} and {MAX_ITERATIONS}."}), 400
        
        A = safe_parse_matrix(raw_A, n)
        b = [float(v) for v in raw_b]

        if len(b) != n:
            return jsonify({"error": f"Vector b must have {n} elements."}), 400

        x0 = None
        if raw_x0:
            x0 = [float(v) for v in raw_x0]
            if len(x0) != n:
                return jsonify({"error": f"Initial guess x0 must have {n} elements."}), 400

        result = jacobi_iteration(A, b, x0, tol, max_iter)
        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500



if __name__ == "__main__":
    app.run(debug=True)
