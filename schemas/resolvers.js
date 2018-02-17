// @flow
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import _ from 'lodash';
import casual from 'casual';
import moment from 'moment';
import rp from 'request-promise';
import { GraphQLError } from 'graphql/error';
import mockServices from './MockServices';
import mockServiceRequests from './MockServiceRequests';
import mockCategories from './MockCategories';
import elasticsearch from 'elasticsearch';

import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();
const TRACE_ADDED_TOPIC = 'newTrace';

var client = new elasticsearch.Client({
  host: '10.1.70.47:9200',
  log: 'trace'
});

const MOCK_TIMEOUT = 1000;

class EsbAPI {

  static getCategory(categoryId: number) : Promise {

    return new Promise( (resolve, reject) => {

        setTimeout( () => {

          let category = mockCategories.find(category => category.CategoryId == categoryId);
          resolve(category);

        }, MOCK_TIMEOUT);
    })

  }

  static getAllCategories(): Promise {

    return new Promise( (resolve, reject) => {

      setTimeout( () => {

        resolve(_.assign([], mockCategories));

      }, MOCK_TIMEOUT);
    })
  }

  static getAllServices() : Promise {

    return new Promise( (resolve, reject) => {

      setTimeout( () => {

        resolve(_.assign([], mockServices));

      }, MOCK_TIMEOUT);
    });

  }

  static getService(objectId: number) : Service {
    return new Service(casual.uuid,
                      casual.integer(300, 400),
                      casual.title,
                      casual.url);
  }

  static getServicesByCategoryId(categoryId: number) : Promise {

    return new Promise( (resolve, reject) => {

        setTimeout( () => {

           let categorizedServices = mockServices.filter( (service) => {
             return service.CategoryId == categoryId;
           });

           resolve(_.assign([], categorizedServices));

        }, MOCK_TIMEOUT);
    })
  }

  static getServiceRequests() : Promise {
    return new Promise( (resolve, reject) => {

      setTimeout( () => {

        resolve(_.assign([], mockServiceRequests));

      }, MOCK_TIMEOUT);
    });
  }
}

function isMockMode(): boolean {

  let mockToken = process.argv.find( (arg: string) => {
    return arg == "--mock"
  });

  return mockToken;
}

class Service {

  constructor(id: string,
              objectId: number,
              name: string,
              address: string,
              description: string,
              sla: number,
              categoryId: number,
              when_published: Date) {
    this.id = id;
    this.objectId = objectId;
    this.name = name;
    this.address = address;
    this.description = description;
    this.sla = sla;
    this.categoryId = categoryId;
    this.when_published = when_published;
  }
}

const repositoryId : string = casual.uuid;

class Repository {

  constructor() {

    this.id = repositoryId;

    this.services = this.services.bind(this);
    this.categories = this.categories.bind(this);
  }

  services({categoryId, page, pageSize}) {

    //const categoryId = param.categoryId;
    if( isMockMode() ) {

      if( !categoryId ) {

        let promise = EsbAPI.getAllServices();
        return promise.then( res => (

          res.map( service => (

            {
              id: casual.uuid,
              objectId: service.ServiceId,
              categoryId: service.CategoryId,
              name: service.ServiceName,
              address: service.ServiceUrl,
              sla: service.ServiceSLA
            }

          ))

        ));

      } else {

        let promise = EsbAPI.getServicesByCategoryId(categoryId);
        return promise.then( res => (

           res.map( service => (

            {
              id: casual.uuid,
              objectId: service.ServiceId,
              categoryId: service.CategoryId,
              name: service.ServiceName,
              address: service.ServiceUrl,
              sla: service.ServiceSLA
            }

          ))

        ));

      }

    } else{

      const url = ( !categoryId ) ?
               //'http://esb01node01/ESBUddiApplication/api/Services'
               'http://m2055895-w7/ESBUddiApplication/api/Services'
               : //'http://esb01node01/ESBUddiApplication/api/Services?categoryId=' + categoryId;
                  'http://m2055895-w7/ESBUddiApplication/api/Services?categoryId=' + categoryId;

      return rp({
        uri: url,
        headers: {
          'User-Agent': 'GraphQL'
        },
        json: true
      }).then( res => {

        return res.map( (service) => (

          {
            id: casual.uuid,
            objectId: service.ServiceId,
            name: service.ServiceName,
            categoryId: service.ServiceCategoryId,
            description: service.ServiceDescription,
            address: service.ServiceUri,
            sla: service.ExpectedSla
          }

        ));

      }).catch( (data) => {
        return Promise.reject(data.error.message);
      })

    }
  }

  categories() {

    if( isMockMode() ) {

        let promise = EsbAPI.getAllCategories();
        return promise.then( res => {

            return res.map( (category) => {

              return {
                id: casual.uuid,
                objectId: category.CategoryId,
                name: category.CategoryName
              }
            });

        });

    } else {

        //const url = 'http://esb01node01/ESBUddiApplication/api/Categories';
        const url = 'http://m2055895-w7/EsbUddiApplication/api/Categories';

        return rp({
          uri: url,
          headers: {
            'User-Agent': 'GraphQL'
          },
          json: true
        }).then( res => {

          return res.map( (category) => {
            return {
              id: casual.uuid,
              objectId: category.CategoryId,
              name: category.CategoryName
            }
          });

        }).catch( (data) => {
          return Promise.reject(data.error.message);
        })

    }
  }

  serviceRequests() {

    if( isMockMode() ) {
      let promise = EsbAPI.getServiceRequests();
      return promise.then( res => {

        return res.map( (request) => {

          return {
            id:  request.id,
            address: request.Url,
            operationName: request.OperationName,
            name: request.ServiceName,
            objectId: request.RequestId,
            categoryId: request.CategoryId,
            environment: 'DOM',
            created: request.PublishRequestDate,
          }

        });

      });
    } else {

      //const url = 'http://esb01/ESBUddiApplication/api/PublishRequest';
      const url = 'http://m2055895-w7/ESBUddiApplication/api/PublishRequest'

      return rp({
        uri: url,
        headers: {
          'User-Agent': 'GraphQL'
        },
        json: true
      }).then( res => {

        return res.map( (request) => {
          return {
            id:  casual.uuid,
            objectId: request.RequestId,
            address: request.Url,
            operationName: request.OperationName,
            name: request.ServiceName,
            categoryId: request.CategoryId,
            environment: 'DOM',
            created: request.PublishRequestDate
          }
        });

      }).catch( (data) => {
        return Promise.reject(data.error.message);
      })

    }
  }

}

var statuses = ['INFO', 'WARNING', 'ERROR'];

class Trace {
  constructor(id, storyId) {
    this.id = id
    this.storyId = storyId;
    this.time = new Date();
    this.message = 'Request recived';
    this.eventId = casual.integer(1, 1000);
    this.status = casual.random_element(statuses);

    let service = casual.random_element(mockServices);
    this.serviceName = service.ServiceName;
    this.serviceId = service.ServiceId;
  }
}

class Summary {
  constructor(date: Date, value: number) {
    this.id = casual.uuid;
    this.date = date;
    this.value = value;
  }
}

class Serie {
  constructor(name: string, daysBefore: number) {
    this.id = casual.uuid;
    this.label = name;
    this.data = casual.array_of_digits(daysBefore)
  }
}

class Series {
  constructor(daysBefore: number,
              servicesIds: number[]) {
    this.id = casual.uuid;

    let labels = []
    for(let i = 0; i < daysBefore; i++) {
      let date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(moment(date).format('DD/MM/YYYY'));
    }

    this.labels = labels;

    this.series = [];
    for(let i = 0; i < servicesIds.length; i++) {
      let service = EsbAPI.getService(servicesIds[i]);
      this.series.push(new Serie(service.name, daysBefore));
    }
  }
}

class EsbRuntime {

  constructor() {
    this.id = casual.uuid;
  }

  distribution({daysBefore, servicesIds}) {
    let _servicesIds: ?number[] = servicesIds;
    let _daysBefore: number = daysBefore;

    return new Series(_daysBefore, _servicesIds);
  }

  totalCalls({before}) {

    let summaries = [];
    //if( isMockMode() ) {

      for(let i = 0; i <= before; i++) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        summaries.push(new Summary(date, casual.integer(10000,30000)));
      }
    // } else {
    //
    // }

    return summaries;
  }

  latency({before}) {

    let summaries = [];

    //if( isMockMode() ) {
      for(let i = 0; i <= before; i++) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        summaries.push(new Summary(new Date(), casual.integer(10, 30)));
      }
    // } else {
    //
    // }

    return summaries;
  }

  errors({before}) {

    let summaries = [];

    //if( isMockMode() ) {
      for(let i = 0; i <= before; i++) {
        let date = new Date();
        date.setDate(date.getDate() - i);
        summaries.push(new Summary(new Date(), casual.integer(0, 10)));
      }
    // } else {
    //
    // }

    return summaries;
  }
}

class ServiceRequest {
  constructor(id: string,
              objectId: number,
              categoryId: number,
              operationName: string,
              uri: string,
              soapAction: string,
              unc: number = 1 | 2,
              created: Date) {
    this.id = id;
    this.objectId = objectId;
    this.categoryId = categoryId;
    this.operationName = operationName;
    this.address = uri;
    this.soapAction = soapAction;
    this.domain = (unc == 1) ? 'AZURE' : 'DOMAIN';
    this.created = new Date(created);
  }
}

export const resolvers = {

  Query: {

    repository: (_, args, context) => {
      return new Repository();
    },

    runtime: (_, args, context) => {
      return new EsbRuntime()
    }
  },

  Mutation: {

    addService: function(_, {input}, context) {

      if( isMockMode() ) {

        let serviceId = casual.uuid;
        return new ServiceRequest(serviceId,
                           casual.integer(2000, 3000),
                           input.categoryId,
                           casual.title,
                           casual.url,
                           input.soapAction,
                           1,
                           new Date());
      }
      else {

        //const url = 'http://esb01node01/ESBUddiApplication/api/Services';
        const url = 'http://m2055895-w7/ESBUddiApplication/api/Services';

        return rp({
          method: 'POST',
          uri: url,
          body: {

              "Name": input.name,
              "Description": null,
              "Url": input.address,
              "SoapAction": input.soapAction,
              "WsdlUrl": input.wsdlUrl,
              "ExpectedSla": input.sla,
              "Pattern": input.pattern,
              "Documentation": null,
              "CategoryId": input.categoryId,
              "Environment": input.environment,
              "OperationName" : null,
              "TargetNameSpace": null
          },
          headers: {
            'User-Agent': 'GraphQL'
          },
          json: true
        }).then( res => {
          console.log(res);

          return new ServiceRequest(casual.uuid,
                                    res.RequestId,
                                    res.CategoryID,
                                    res.ServiceName,
                                    res.ServiceUri,
                                    res.ServiceSoapAction,
                                    res.Unc,
                                    res.PublishRequestDate);

        }).catch( (error) => {
          console.log(error.message);
          return new GraphQLError(error.message);
        });

      }
    },

    publishServiceRequest: function(_, {input}, context): Service {

        let requestId: number = input;

        if( isMockMode() ) {
            return new Service(casual.uuid,
                               casual.integer(300, 400),
                               casual.title,
                               casual.url,
                               casual.description,
                               casual.integer(100, 200),
                               casual.integer(1,2),
                               new Date());
        } else {
            const url = 'http://m2055895-w7/ESBUddiApplication/api/PublishRequest?requestId=' + requestId;

            return rp({
              method: 'POST',
              uri: url,
              headers: {
                'User-Agent': 'GraphQL',
                'Accept': 'application/json'
              },
              json: true
            }).then( res => {
              console.log(res);
            }).catch( err => {
              console.log(err);
              return new GraphQLError(err.error.Message);
            });
        }
    },

    deleteServiceRequest: function(_, {input}, context) {

      let requestId = input;

      if( isMockMode() ) {
          return true;
      } else {
        const url = 'http://m2055895-w7/ESBUddiApplication/api/PublishRequest?requestId=' + requestId;
        return rp({
          method: 'DELETE',
          uri: url,
          headers: {
            'User-Agent': 'GraphQL',
            'Accept': 'application/json'
          },
          json: true
        }).then( res => {
          return true;
        }).catch( err => {
          console.log(err);
          return new GraphQLError(err.error.Message);
        })
      }

    },

    disableService(_, {input}, context) {

      //if( isMockMode() ) {

        let serviceId = casual.uuid;
        return new ServiceRequest(serviceId,
                           casual.integer(2000, 3000),
                           input.categoryId,
                           casual.title,
                           casual.url,
                           input.soapAction,
                           1,
                           new Date());
      //}
    },

    deleteService(_, {input}, context) {
      //if( isMockMode() ) {

        let serviceId = casual.uuid;
        return new ServiceRequest(serviceId,
                           casual.integer(2000, 3000),
                           input.categoryId,
                           casual.title,
                           casual.url,
                           input.soapAction,
                           1,
                           new Date());
      //}

    },

    addTrace: (_, args) => {
      const newTrace = new Trace(casual.uuid, // id
                                 casual.uuid // storyId
                               );
      pubsub.publish(TRACE_ADDED_TOPIC, {
          traceAdded: newTrace
      });
      return newTrace;
    },

  },


  Subscription: {

      traceAdded: {
        subscribe: () => {
          console.log('Subscribe');

          setInterval( () => {

            const newTrace = new Trace(casual.uuid, //id
                                       casual.uuid // storyId);
                                     );
            return pubsub.publish(TRACE_ADDED_TOPIC, {
                                                        traceAdded: newTrace
                                                       });

          }, 2000);

          return pubsub.asyncIterator(TRACE_ADDED_TOPIC);
        }
      }

    }
}
