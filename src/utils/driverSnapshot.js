// Public driver snapshot written onto an order when a driver claims it — the
// { name, vehicle, rating, avatar, phone } shape the customer's tracking screen
// reads. Shared by driverController (legacy board claim) and dispatchService
// (offer accept) so both produce an identical snapshot.
function driverSnapshot(user) {
  const meta = user.metadata || {};
  return {
    name: user.full_name || user.username,
    vehicle: meta.vehicle || 'Motorbike',
    rating: typeof meta.rating === 'number' ? meta.rating : 5,
    avatar: user.profile_image || null,
    phone: `${user.country_code}${user.phone_number}`,
  };
}

module.exports = { driverSnapshot };
