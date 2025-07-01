import * as path from "path";
import * as yaml from "js-yaml";
import { db } from "./neo4j.js";
import { NodeType } from "./types.js";

export async function generate_services_config(): Promise<any[]> {
  const serviceMap = new Map<string, any>();
  const pkgFiles = await db.get_pkg_files();

  for (const file of pkgFiles) {
    const name = file.properties.name;
    const body = file.properties.body;
    const dir = path.dirname(file.properties.file);
    const service: any = {
      name: "",
      language: "",
      dev: true,
      scripts: {},
      env: {},
    };

    if (name.endsWith("package.json")) {
      const pkg = JSON.parse(body);
      service.name = pkg.name || path.basename(dir);
      service.language = "javascript";
      service.scripts = {
        install: "npm install",
        start: pkg.scripts?.start || "npm start",
        build: pkg.scripts?.build || "npm run build",
        test: pkg.scripts?.test || "npm test",
      };
    } else if (name.endsWith("go.mod")) {
      const moduleName = body.match(/module\s+([\w\/\.-]+)/)?.[1];
      const serviceName = moduleName
        ? path.basename(moduleName)
        : path.basename(dir);
      service.name = serviceName;
      service.language = "go";
      service.scripts = {
        install: "go mod tidy",
        build: `go build -o ${serviceName}`,
        start: `./${serviceName}`,
        test: "go test ./...",
      };
    }

    if (service.name) {
      serviceMap.set(service.name, service);
    }
  }

  let node_type: NodeType = "File";
  const allFiles = await db.nodes_by_type(node_type);
  const dcFiles = allFiles.filter(
    (f) =>
      f.properties.name.endsWith("docker-compose.yml") ||
      f.properties.name.endsWith("docker-compose.yaml")
  );

  for (const dcFile of dcFiles) {
    const dcContent = yaml.load(dcFile.properties.body) as any;

    if (dcContent && dcContent.services) {
      for (const serviceName in dcContent.services) {
        const dcService = dcContent.services[serviceName];
        const service = serviceMap.get(serviceName) || {
          name: serviceName,
          dev: false,
          scripts: {},
          env: {},
        };

        if (dcService.environment) {
          const env = Array.isArray(dcService.environment)
            ? Object.fromEntries(
                dcService.environment.map((e: string) => e.split("="))
              )
            : dcService.environment;
          service.env = { ...service.env, ...env };
        }
        serviceMap.set(serviceName, service);
      }
    }
  }

  return Array.from(serviceMap.values());
}
