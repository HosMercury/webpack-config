mod api;
mod authz;
mod users;
mod validations;
mod web;

use oauth2::{basic::BasicClient, AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[macro_use]
extern crate rust_i18n;
i18n!("locales", fallback = "en");

#[derive(Clone)]
struct AppState {
    db: PgPool,
    client: BasicClient,
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(EnvFilter::new(std::env::var("RUST_LOG").unwrap_or_else(
            |_| "axum=debug,tower_sessions=debug,sqlx=warn,tower_http=debug".into(),
        )))
        .with(tracing_subscriber::fmt::layer())
        .try_init()?;

    dotenvy::dotenv()?;
    //////////////////////////////// OAuth ///////////////////////////////////
    let client_id = env::var("CLIENT_ID")
        .map(ClientId::new)
        .expect("CLIENT_ID should be provided.");

    let client_secret = env::var("CLIENT_SECRET")
        .map(ClientSecret::new)
        .expect("CLIENT_SECRET should be provided");

    let auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())?;
    let token_url = TokenUrl::new("https://www.googleapis.com/oauth2/v3/token".to_string())?;

    let client = BasicClient::new(client_id, Some(client_secret), auth_url, Some(token_url))
        .set_redirect_uri(
            RedirectUrl::new("http://localhost:3000/oauth/callback".to_string())
                .expect("Invalid redirect URL"),
        );
    /////////////////////////////////  DB  ///////////////////////////////////////////
    let db_url: String = env::var("DATABASE_URL").unwrap();

    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("error connection to db");

    sqlx::migrate!().run(&db).await?;
    /////////////////////////////////  State  ////////////////////////////////////////
    let app_state = AppState {
        db: db.clone(),
        client,
    };

    let app = web::router()
        .merge(api::router(&app_state))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}
