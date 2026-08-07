from flask import Blueprint, request, jsonify

from database import get_db
from auth import login_required, current_user_id

import_syllabus_bp = Blueprint(
    "import_syllabus",
    __name__,
    url_prefix="/api/import",
)


@import_syllabus_bp.post("/syllabus")
@login_required
def import_syllabus():

    data = request.get_json(force=True) or {}

    subject_name = (data.get("subject") or "").strip()
    units = data.get("units") or []

    if not subject_name:
        return jsonify({"error": "Subject name is required"}), 400

    if not units:
        return jsonify({"error": "No units to import"}), 400


    conn = get_db()

    try:
        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO subjects (user_id, name)
                VALUES (%s, %s)
                RETURNING id
                """,
                (
                    current_user_id(),
                    subject_name
                )
            )

            subject_id = cur.fetchone()["id"]

            imported_units = 0
            imported_topics = 0


            for order, unit in enumerate(units, start=1):

                if unit.get("selected") is False:
                    continue

                unit_name = (unit.get("name") or "").strip()

                if not unit_name:
                    continue


                cur.execute(
                    """
                    INSERT INTO units
                    (subject_id, name, order_index)
                    VALUES (%s,%s,%s)
                    RETURNING id
                    """,
                    (
                        subject_id,
                        unit_name,
                        order
                    )
                )

                unit_id = cur.fetchone()["id"]

                imported_units += 1


                topic_order = 1

                for topic in unit.get("topics", []):

                    if isinstance(topic, str):
                        topic_name = topic.strip()
                        subtopics = []

                    else:
                        topic_name = (topic.get("title") or "").strip()
                        subtopics = topic.get("subtopics") or []


                    if not topic_name:
                        continue


                    cur.execute(
                        """
                        INSERT INTO topics
                        (unit_id, parent_topic_id, name, order_index)
                        VALUES (%s,NULL,%s,%s)
                        RETURNING id
                        """,
                        (
                            unit_id,
                            topic_name,
                            topic_order
                        )
                    )

                    parent_topic_id = cur.fetchone()["id"]

                    imported_topics += 1
                    topic_order += 1


                    sub_order = 1

                    for sub in subtopics:

                        sub = str(sub).strip()

                        if not sub:
                            continue


                        cur.execute(
                            """
                            INSERT INTO topics
                            (unit_id,parent_topic_id,name,order_index)
                            VALUES (%s,%s,%s,%s)
                            """,
                            (
                                unit_id,
                                parent_topic_id,
                                sub,
                                sub_order
                            )
                        )

                        imported_topics += 1
                        sub_order += 1


        conn.commit()


    except Exception as e:
        conn.rollback()
        raise e

    finally:
        conn.close()


    return jsonify({
        "success": True,
        "subject_id": subject_id,
        "subject": subject_name,
        "units_created": imported_units,
        "topics_created": imported_topics
    })
