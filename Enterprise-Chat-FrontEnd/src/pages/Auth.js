import React, { useEffect, useState } from "react";

const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const KEYCLOAK_URL = "http://localhost:8080";
const REALM = "EnterpriseChatRealm";
const CLIENT_ID = "Enterprise-Front";
const REDIRECT_URI = "http://localhost:3000";

export const redirectToKeycloakPKCE = async () => {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem("pkce_code_verifier", verifier);

  const challenge = await generateCodeChallenge(verifier);

  const authUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&scope=openid profile email` +  // Pedimos acesso ao perfil do usuário
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  window.location.href = authUrl;
};

const Auth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processAuth = async () => {
      // A. Verifica se existe um token ativo guardado na sessão
      const savedToken = sessionStorage.getItem("access_token");
      if (savedToken) {
        const userData = parseJwt(savedToken);
        if (userData && userData.exp * 1000 > Date.now()) {
          setUser(userData);
          setLoading(false);
          return;
        } else {
          // Token expirado
          sessionStorage.removeItem("access_token");
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const verifier = sessionStorage.getItem("pkce_code_verifier");

      if (code && verifier) {
        try {
          const bodyParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            code: code,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier
          });

          const response = await fetch(
            `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: bodyParams
            }
          );

          if (!response.ok) {
            throw new Error("Falha ao obter o token do Keycloak");
          }

          const data = await response.json();

          sessionStorage.setItem("access_token", data.access_token);
          sessionStorage.removeItem("pkce_code_verifier");
          window.history.replaceState({}, document.title, window.location.pathname);

          const userData = parseJwt(data.access_token);
          setUser(userData);
        } catch (error) {
          console.error("Erro na autenticação:", error);
        }
      }

      setLoading(false);
    };

    processAuth();
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    setUser(null);
    window.location.href = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Carregando...</div>;
  }

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        backgroundColor: "#1e293b",
        color: "#fff"
      }}>
        <h2>Enterprise Chat</h2>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Ícone / Avatar do Bonequinho */}
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16px"
            }}>
              {user.preferred_username ? user.preferred_username[0].toUpperCase() : "👤"}
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: "600", fontSize: "14px" }}>
                {user.name || user.preferred_username}
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                {user.email || "Usuário Conectado"}
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                marginLeft: "10px",
                padding: "6px 12px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
            </button>
          </div>
        ) : (
          <button
            onClick={redirectToKeycloakPKCE}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Entrar com Keycloak
          </button>
        )}
      </header>

      <main style={{ padding: "20px", textAlign: "center" }}>
        {user ? (
          <h3>Bem-vindo ao Chat Empresarial, {user.given_name || user.preferred_username}!</h3>
        ) : (
          <h3>Por favor, faça login para acessar a aplicação.</h3>
        )}
      </main>
    </div>
  );
};

export default Auth;