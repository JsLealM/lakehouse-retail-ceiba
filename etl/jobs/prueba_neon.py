"""
Job temporal prueba_neon (#5): confirma que un job de Glue SIN conexión de red y SIN VPC
llega a Neon por internet (TLS). Imprime el conteo de retail.cliente (esperado: 120011).

AWS (Glue):  --secret_oltp ceiba/neon-oltp
Local:       sin argumentos; usa NEON_HOST, NEON_PORT, NEON_DBNAME, NEON_USER, NEON_PASSWORD del .env
Se borra después de la prueba: no forma parte del pipeline.
"""
import argparse
import json
import os

from awsglue.context import GlueContext
from pyspark.context import SparkContext


def credenciales(secret):
    if secret:
        import boto3
        sm = boto3.client("secretsmanager", region_name="us-east-2")
        return json.loads(sm.get_secret_value(SecretId=secret)["SecretString"])
    return {
        "host": os.environ["NEON_HOST"],
        "port": os.environ.get("NEON_PORT", "5432"),
        "dbname": os.environ["NEON_DBNAME"],
        "username": os.environ["NEON_USER"],
        "password": os.environ["NEON_PASSWORD"],
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--secret_oltp")
    args, _ = p.parse_known_args()  # Glue agrega argumentos propios

    c = credenciales(args.secret_oltp)
    spark = GlueContext(SparkContext.getOrCreate()).spark_session

    df = (spark.read.format("jdbc")
          .option("url", f"jdbc:postgresql://{c['host']}:{c['port']}/{c['dbname']}?sslmode=require")
          .option("dbtable", "(SELECT count(*) AS n FROM retail.cliente) AS q")
          .option("user", c["username"])
          .option("password", c["password"])
          .option("driver", "org.postgresql.Driver")
          .load())

    n = df.collect()[0]["n"]
    origen = "Secrets Manager" if args.secret_oltp else "variables de entorno"
    print(f"[prueba_neon] credenciales desde {origen}")
    print(f"[prueba_neon] retail.cliente: {n} filas (esperado 120011)")


if __name__ == "__main__":
    main()