use crate::repo::Repo;
use serde::{Deserialize, Serialize};
use tracing::{debug, info};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct StatusUpdate {
    pub status: String,
    pub message: String,
    pub step: u32,
    pub total_steps: u32,
    pub progress: u32,
}

impl StatusUpdate {
    pub fn as_json_str(&self) -> String {
        match serde_json::to_string(self) {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("Error serializing StatusUpdate: {}", e);
                "{}".to_string()
            }
        }
    }
}

impl Repo {
    pub fn send_status_update(&self, msg: &str, step: u32) {
        let su = StatusUpdate {
            status: "".to_string(),
            message: msg.to_string(),
            step,
            total_steps: 16,
            progress: 0,
        };
        info!("status_update: {:?}", su);
        if let Some(status_tx) = &self.status_tx {
            if let Err(e) = status_tx.send(su) {
                tracing::error!("Error sending status update: {}", e);
            }
        }
    }

    pub fn send_status_progress(&self, progress: usize, total_files: usize) {
        // return;
        let current_progress = ((progress * 100) / total_files) as u32;
        let now = std::time::Instant::now();

        static LAST_PROGRESS: std::sync::atomic::AtomicU32 =
            std::sync::atomic::AtomicU32::new(u32::MAX);
        static LAST_TIME: std::sync::OnceLock<std::sync::Mutex<std::time::Instant>> =
            std::sync::OnceLock::new();

        let last_progress = LAST_PROGRESS.load(std::sync::atomic::Ordering::Relaxed);
        let last_time_mutex = LAST_TIME.get_or_init(|| std::sync::Mutex::new(now));

        let should_send = if current_progress != last_progress {
            let last_time = *last_time_mutex.lock().unwrap();
            let time_elapsed = now.duration_since(last_time).as_millis() >= 100;
            let is_complete = current_progress >= 100;
            time_elapsed || is_complete
        } else {
            false
        };

        if should_send {
            LAST_PROGRESS.store(current_progress, std::sync::atomic::Ordering::Relaxed);
            *last_time_mutex.lock().unwrap() = now;

            let su = StatusUpdate {
                total_steps: 16,
                progress: current_progress,
                ..Default::default()
            };
            debug!("progress: {:?}", su);
            if let Some(status_tx) = &self.status_tx {
                if let Err(e) = status_tx.send(su) {
                    tracing::error!("Error sending progress update: {}", e);
                }
            }
        }
    }
}
