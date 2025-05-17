/*
use crate::network_traffic_analysis::model::packet_metrics::PacketMetrics;
use some_ml_library::Model; // Replace with the actual ML library you're using

pub struct InferenceModel {
    model: Model, // Replace with the actual model type
}

impl InferenceModel {
    pub fn new(model_path: &str) -> Self {
        let model = Model::load(model_path).expect("Failed to load the model");
        InferenceModel { model }
    }

    pub fn predict_safety(&self, packet_metrics: &PacketMetrics) -> String {
        // Extract features from PacketMetrics
        let input_data = vec![
            packet_metrics.feature1,
            packet_metrics.feature2,
            packet_metrics.feature3,
            // Add all necessary features here
        ];

        // Perform inference
        let prediction = self.model.predict(&input_data);

        // Convert prediction to a String output
        match prediction {
            0 => "Safe".to_string(),
            1 => "Unsafe".to_string(),
            _ => "Unknown".to_string(),
        }
    }
}
*/

//oh if u really looked at the code, i gave up on model for now, so dont waste ur time on it :>