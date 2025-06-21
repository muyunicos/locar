<?php

class DatabaseManager {
    private static $instance = null;
    private $conn;

    private $host = 'localhost';
    private $db_name = 'u274449136_locar';
    private $username = 'u274449136_jrp';
    private $password = 'Z5gh^sMm4bxsv@y3';

    private function __construct() {
        $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";

        try {
            $this->conn = new PDO($dsn, $this->username, $this->password);
            // Configurar PDO para que lance excepciones en caso de error
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            die("Error: No se pudo conectar a la base de datos. Por favor, intente más tarde.");
        }
    }

    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new DatabaseManager();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}