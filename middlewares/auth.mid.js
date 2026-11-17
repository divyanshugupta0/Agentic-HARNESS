import adminAuth from "../config/firebase.js";

async function checkAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized: Token missing"
            });
        }

        const token = authHeader.split(" ")[1];

        const decodedToken = await adminAuth.verifyIdToken(token);

        req.user = decodedToken;

        next();

    } catch (error) {
        console.error("Firebase Auth Error:", error.message);

        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token"
        });
    }
}

export default checkAuth;