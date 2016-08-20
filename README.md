# macHistory
Собирает статистику MAC адреса на портах коммутаторов по SNMP и сохраняет историю в БД

# Требования:
* Node.js
* MongoDB
* поддерживает аутентификацию через SPNEGO (нужно сгенерировать kerberos.keytab и перед запуском экспортировать переменную окружения KRB5_KTNAME=<путь>/kerberos.keytab)

# Настройка
* Прописать корневой концентратор
* Запустить web-сервер node app.js
* Зайти в настройку vlan - получить список vlan с него
* Добавить в настройках коммутаторы
* Проверить коммутаторы на доступность через snmp
* Запустить сбор MAC адресов через web-интерфейс или отправив POST запрос с самого сервера
сurl -sk -X POST 'https://127.0.0.1:3002/collectMAC' -d "collectMAC"
