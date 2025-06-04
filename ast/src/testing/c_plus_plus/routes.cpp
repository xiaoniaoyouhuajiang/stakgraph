#include "routes.h"
#include <nlohmann/json.hpp>

void setup_routes(crow::SimpleApp& app, Database& db) {
    CROW_ROUTE(app, "/person/<int>")
    ([&db](int id){
        auto person_opt = db.getPerson(id);
        if (!person_opt) return crow::response(404, "Not found");
        nlohmann::json j = {
            {"id", person_opt->id},
            {"name", person_opt->name},
            {"email", person_opt->email}
        };
        return crow::response{j.dump()};
    });

    CROW_ROUTE(app, "/person").methods("POST"_method)
    ([&db](const crow::request& req){
        auto j = nlohmann::json::parse(req.body, nullptr, false);
        if (j.is_discarded() || !j.contains("id") || !j.contains("name") || !j.contains("email"))
            return crow::response(400, "Invalid JSON");
        Person p{j["id"], j["name"], j["email"]};
        if (!db.createPerson(p))
            return crow::response(500, "DB error");
        return crow::response(201, j.dump());
    });
}