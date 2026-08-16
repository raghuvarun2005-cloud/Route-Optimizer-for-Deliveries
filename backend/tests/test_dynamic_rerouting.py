import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app.services.routing_service import RoutingService
from backend.app.services.incident_service import IncidentService

# Create in-memory SQLite database for testing
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_dynamic_rerouting_recalculates_from_current_location(db_session):
    """Test dynamic rerouting from vehicle's current position when incident is triggered ahead."""
    routing_service = RoutingService()

    src_lat, src_lng = 12.9716, 77.5946
    dest_lat, dest_lng = 12.9352, 77.6245

    # 1. Initial route calculation
    initial_route = routing_service.calculate_route(db_session, src_lat, src_lng, dest_lat, dest_lng)
    assert initial_route["success"] is True

    # 2. Simulate vehicle moving to intermediate position
    curr_lat, curr_lng = 12.9534, 77.60955

    # 3. Trigger dynamic reroute from current position with accident on main road R102
    rerouted = routing_service.reroute_from_current_location(
        db=db_session,
        curr_lat=curr_lat,
        curr_lng=curr_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        affected_road_id="R102"
    )

    assert rerouted["success"] is True
    assert rerouted["is_rerouted"] is True
    assert "reroute_summary" in rerouted
    summary = rerouted["reroute_summary"]
    assert summary["recalculated_from"]["latitude"] == curr_lat
    assert summary["recalculated_from"]["longitude"] == curr_lng

def test_incident_clearance_restores_clean_state(db_session):
    """Test clearing incidents removes route penalties."""
    incident_service = IncidentService()
    routing_service = RoutingService()

    # Create incident
    inc = incident_service.create_incident(db_session, 12.95, 77.60, road_id="R102", severity="SEVERE")
    assert len(incident_service.get_active_incidents(db_session)) == 1

    # Clear incident
    incident_service.clear_all_incidents(db_session)
    assert len(incident_service.get_active_incidents(db_session)) == 0
